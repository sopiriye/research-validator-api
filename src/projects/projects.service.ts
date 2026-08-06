import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
  ProjectRecordStatus,
} from '@prisma/client';
import { AuthenticatedAdmin } from '../common/types/authenticated-admin.type';
import { toProgrammeLabel } from '../common/utils/programme.utils';
import { countWords, sanitizePlainText } from '../common/utils/text.utils';
import { DatabaseService } from '../database/database.service';
import { DepartmentsService } from '../departments/departments.service';
import { TitleNormalizationService } from '../validation/normalization/title-normalization.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

type ProjectWithProgramme = Prisma.ProjectRecordGetPayload<{
  include: { programme: { select: { code: true } } };
}>;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly departments: DepartmentsService,
    private readonly titleNormalization: TitleNormalizationService,
  ) {}

  async create(actor: AuthenticatedAdmin, dto: CreateProjectDto) {
    const projectName = sanitizePlainText(dto.projectName);
    const normalizedProjectName =
      this.titleNormalization.normalize(projectName);
    const abstract = this.sanitizeAbstract(dto.abstract);
    this.assertNormalizedTitle(normalizedProjectName);
    const programme = await this.departments.getActiveProgramme(
      actor.departmentId,
      dto.programme,
    );

    try {
      const record = await this.database.transaction(async (tx) => {
        await this.assertProjectUniqueness(
          tx,
          actor.departmentId,
          normalizedProjectName,
          dto.serialNumber,
        );
        const created = await tx.projectRecord.create({
          data: {
            departmentId: actor.departmentId,
            programmeId: programme.id,
            supervisee: sanitizePlainText(dto.supervisee),
            projectName,
            normalizedProjectName,
            supervisor: sanitizePlainText(dto.supervisor),
            yearOfCompletion: dto.yearOfCompletion,
            serialNumber: dto.serialNumber,
            abstract,
            createdByAdminId: actor.id,
          },
          include: { programme: { select: { code: true } } },
        });

        await tx.auditLog.create({
          data: {
            departmentId: actor.departmentId,
            adminId: actor.id,
            action: AuditAction.CREATE,
            entityType: AuditEntityType.PROJECT_RECORD,
            entityId: created.id,
            description: 'Project record created.',
            newValues: this.auditValues(created),
          },
        });
        return created;
      });
      return this.toDetailResponse(record);
    } catch (error) {
      this.rethrowKnownConflict(error);
    }
  }

  async findAll(actor: AuthenticatedAdmin, query: ProjectQueryDto) {
    const where: Prisma.ProjectRecordWhereInput = {
      departmentId: actor.departmentId,
      status: ProjectRecordStatus.ACTIVE,
      deletedAt: null,
      ...(query.programme
        ? { programme: { is: { code: query.programme } } }
        : {}),
      ...(query.yearOfCompletion
        ? { yearOfCompletion: query.yearOfCompletion }
        : {}),
      ...(query.supervisor
        ? { supervisor: { contains: query.supervisor, mode: 'insensitive' } }
        : {}),
      ...(query.serialNumber
        ? {
            serialNumber: { contains: query.serialNumber, mode: 'insensitive' },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { projectName: { contains: query.search, mode: 'insensitive' } },
              { supervisee: { contains: query.search, mode: 'insensitive' } },
              { supervisor: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [records, totalItems] = await Promise.all([
      this.database.projectRecord.findMany({
        where,
        include: { programme: { select: { code: true } } },
        orderBy: [{ yearOfCompletion: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.database.projectRecord.count({ where }),
    ]);

    return {
      records: records.map((record) => this.toListResponse(record)),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.limit)),
      },
    };
  }

  async findOne(actor: AuthenticatedAdmin, id: string) {
    const record = await this.getActiveRecordOrThrow(id, actor.departmentId);
    return this.toDetailResponse(record);
  }

  async update(actor: AuthenticatedAdmin, id: string, dto: UpdateProjectDto) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'At least one project field must be provided.',
      );
    }

    try {
      const record = await this.database.transaction(async (tx) => {
        const existing = await this.getActiveRecordOrThrow(
          id,
          actor.departmentId,
          tx,
        );
        const nextProjectName = dto.projectName
          ? sanitizePlainText(dto.projectName)
          : existing.projectName;
        const nextNormalizedName = dto.projectName
          ? this.titleNormalization.normalize(nextProjectName)
          : existing.normalizedProjectName;
        this.assertNormalizedTitle(nextNormalizedName);
        const nextSerialNumber = dto.serialNumber ?? existing.serialNumber;
        let programmeId = existing.programmeId;
        if (dto.programme) {
          programmeId = (
            await this.departments.getActiveProgramme(
              actor.departmentId,
              dto.programme,
            )
          ).id;
        }
        const nextAbstract =
          dto.abstract !== undefined
            ? this.sanitizeAbstract(dto.abstract)
            : existing.abstract;

        await this.assertProjectUniqueness(
          tx,
          actor.departmentId,
          nextNormalizedName,
          nextSerialNumber,
          id,
        );
        await this.writeVersion(
          tx,
          existing,
          actor.id,
          'Project record updated.',
        );
        const updated = await tx.projectRecord.update({
          where: { id },
          data: {
            supervisee:
              dto.supervisee !== undefined
                ? sanitizePlainText(dto.supervisee)
                : undefined,
            projectName:
              dto.projectName !== undefined ? nextProjectName : undefined,
            normalizedProjectName:
              dto.projectName !== undefined ? nextNormalizedName : undefined,
            supervisor:
              dto.supervisor !== undefined
                ? sanitizePlainText(dto.supervisor)
                : undefined,
            yearOfCompletion: dto.yearOfCompletion,
            programmeId,
            serialNumber: dto.serialNumber,
            abstract: nextAbstract,
            updatedByAdminId: actor.id,
          },
          include: { programme: { select: { code: true } } },
        });
        await tx.auditLog.create({
          data: {
            departmentId: actor.departmentId,
            adminId: actor.id,
            action: AuditAction.UPDATE,
            entityType: AuditEntityType.PROJECT_RECORD,
            entityId: id,
            description: 'Project record updated.',
            oldValues: this.auditValues(existing),
            newValues: this.auditValues(updated),
          },
        });
        return updated;
      });
      return this.toDetailResponse(record);
    } catch (error) {
      this.rethrowKnownConflict(error);
    }
  }

  async remove(actor: AuthenticatedAdmin, id: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const existing = await this.getActiveRecordOrThrow(
        id,
        actor.departmentId,
        tx,
      );
      await this.writeVersion(
        tx,
        existing,
        actor.id,
        'Project record deleted.',
      );
      const deletedAt = new Date();
      await tx.projectRecord.update({
        where: { id },
        data: {
          status: ProjectRecordStatus.DELETED,
          deletedAt,
          deletedByAdminId: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          departmentId: actor.departmentId,
          adminId: actor.id,
          action: AuditAction.DELETE,
          entityType: AuditEntityType.PROJECT_RECORD,
          entityId: id,
          description: 'Project record soft deleted.',
          oldValues: this.auditValues(existing),
        },
      });
    });
  }

  async getPublicAbstract(id: string) {
    const department = await this.departments.getDefaultDepartment();
    const record = await this.database.projectRecord.findFirst({
      where: {
        id,
        departmentId: department.id,
        status: ProjectRecordStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true, abstract: true },
    });
    if (!record) {
      throw new NotFoundException('Project record not found.');
    }

    const abstract = record.abstract.trim() ? record.abstract : null;
    return {
      message: abstract
        ? 'Project abstract retrieved successfully.'
        : 'No abstract is available for this project.',
      data: { projectId: record.id, abstract },
    };
  }

  private async getActiveRecordOrThrow(
    id: string,
    departmentId: string,
    client: Prisma.TransactionClient | DatabaseService = this.database,
  ): Promise<ProjectWithProgramme> {
    const record = await client.projectRecord.findFirst({
      where: {
        id,
        departmentId,
        status: ProjectRecordStatus.ACTIVE,
        deletedAt: null,
      },
      include: { programme: { select: { code: true } } },
    });
    if (!record) {
      throw new NotFoundException('Project record not found.');
    }
    return record;
  }

  private async assertProjectUniqueness(
    tx: Prisma.TransactionClient,
    departmentId: string,
    normalizedProjectName: string,
    serialNumber: string,
    excludingId?: string,
  ): Promise<void> {
    const duplicate = await tx.projectRecord.findFirst({
      where: {
        departmentId,
        OR: [{ normalizedProjectName }, { serialNumber }],
        ...(excludingId ? { id: { not: excludingId } } : {}),
      },
      select: { normalizedProjectName: true, serialNumber: true },
    });
    if (duplicate?.normalizedProjectName === normalizedProjectName) {
      throw new ConflictException(
        'A project record with this normalized title already exists.',
      );
    }
    if (duplicate?.serialNumber === serialNumber) {
      throw new ConflictException(
        'A project record with this serial number already exists.',
      );
    }
  }

  private async writeVersion(
    tx: Prisma.TransactionClient,
    record: ProjectWithProgramme,
    adminId: string,
    changeSummary: string,
  ): Promise<void> {
    const versionNumber =
      (await tx.projectRecordVersion.count({
        where: { projectRecordId: record.id },
      })) + 1;
    await tx.projectRecordVersion.create({
      data: {
        projectRecordId: record.id,
        versionNumber,
        supervisee: record.supervisee,
        projectName: record.projectName,
        normalizedProjectName: record.normalizedProjectName,
        supervisor: record.supervisor,
        yearOfCompletion: record.yearOfCompletion,
        programmeId: record.programmeId,
        serialNumber: record.serialNumber,
        status: record.status,
        changeSummary,
        changedByAdminId: adminId,
      },
    });
  }

  private sanitizeAbstract(value: string): string {
    const abstract = sanitizePlainText(value);
    if (!abstract) {
      throw new BadRequestException('Abstract must not be empty.');
    }
    if (countWords(abstract) > 300) {
      throw new BadRequestException('Abstract must not exceed 300 words.');
    }
    return abstract;
  }

  private assertNormalizedTitle(value: string): void {
    if (!value) {
      throw new BadRequestException(
        'Project name must contain letters or numbers.',
      );
    }
  }

  private toListResponse(record: ProjectWithProgramme) {
    return {
      id: record.id,
      supervisee: record.supervisee,
      projectName: record.projectName,
      supervisor: record.supervisor,
      yearOfCompletion: record.yearOfCompletion,
      programme: toProgrammeLabel(record.programme.code),
      serialNumber: record.serialNumber,
    };
  }

  private toDetailResponse(record: ProjectWithProgramme) {
    return {
      ...this.toListResponse(record),
      normalizedProjectName: record.normalizedProjectName,
      abstract: record.abstract,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private auditValues(record: ProjectWithProgramme) {
    return {
      supervisee: record.supervisee,
      projectName: record.projectName,
      normalizedProjectName: record.normalizedProjectName,
      supervisor: record.supervisor,
      yearOfCompletion: record.yearOfCompletion,
      programmeId: record.programmeId,
      serialNumber: record.serialNumber,
      status: record.status,
    };
  }

  private rethrowKnownConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A project record with this title or serial number already exists.',
      );
    }
    throw error;
  }
}

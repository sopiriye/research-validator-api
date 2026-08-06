import { registerDecorator, ValidationOptions } from 'class-validator';
import { countWords, sanitizePlainText } from '../../common/utils/text.utils';

export function MaxAbstractWords(
  maximum: number,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'maxAbstractWords',
      target: object.constructor,
      propertyName,
      constraints: [maximum],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' &&
            countWords(sanitizePlainText(value)) <= maximum
          );
        },
        defaultMessage: () => `Abstract must not exceed ${maximum} words.`,
      },
    });
  };
}

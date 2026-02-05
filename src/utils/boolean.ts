export const boolean = <T>(value: T | undefined | null): value is T => {
  return value != undefined;
};

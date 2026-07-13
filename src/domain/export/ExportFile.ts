export class ExportFile {
  constructor(
    readonly fileName: string,
    readonly mimeType: string,
    readonly content: string
  ) {}
}

export type ExportColumn<T> = {
  header: string
  value: (row: T) => string
}

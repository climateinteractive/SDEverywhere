// Copyright (c) 2022 Climate Interactive / New Venture Fund

export function optionalString(stringValue?: string): string | undefined {
  if (stringValue !== undefined && stringValue.length > 0) {
    return stringValue
  } else {
    return undefined
  }
}

export function optionalNumber(stringValue?: string): number | undefined {
  if (stringValue !== undefined && stringValue.length > 0) {
    return Number(stringValue)
  } else {
    return undefined
  }
}

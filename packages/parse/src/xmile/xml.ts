// Copyright (c) 2023-2026 Climate Interactive / New Venture Fund

import type { XmlElement, XmlText } from '@rgrove/parse-xml'
import { XmlNode } from '@rgrove/parse-xml'

export function firstElemOf(parent: XmlElement | undefined, tagName: string): XmlElement | undefined {
  return parent?.children.find(n => {
    if (n.type === XmlNode.TYPE_ELEMENT) {
      const e = n as XmlElement
      return e.name === tagName
    } else {
      return undefined
    }
  }) as XmlElement
}

export function firstTextOf(parent: XmlElement | undefined): XmlText | undefined {
  return parent?.children.find(n => {
    return n.type === XmlNode.TYPE_TEXT
  }) as XmlText
}

export function elemsOf(parent: XmlElement | undefined, tagNames: string[]): XmlElement[] {
  if (parent === undefined) {
    return []
  }

  const elems: XmlElement[] = []
  for (const n of parent.children) {
    if (n.type === XmlNode.TYPE_ELEMENT) {
      const e = n as XmlElement
      if (tagNames.includes(e.name)) {
        elems.push(e)
      }
    }
  }
  return elems
}

export function xmlError(elem: XmlElement, msg: string): string {
  return `${msg}: ${JSON.stringify(elem.toJSON(), null, 2)}`
}

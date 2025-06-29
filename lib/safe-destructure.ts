/**
 * Safely destructures properties from an object with default values
 * @param obj The object to destructure from
 * @param defaults Default values for the properties
 * @returns An object with the destructured properties or default values
 */
export function safeDestructure<T extends Record<string, any>>(obj: T | undefined | null, defaults: T): T {
  if (!obj) return { ...defaults }

  const result = { ...defaults }

  // Only copy properties that exist in defaults
  Object.keys(defaults).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  })

  return result
}

/**
 * Safely gets a property from an object with a default value
 * @param obj The object to get the property from
 * @param key The property key
 * @param defaultValue The default value if the property doesn't exist
 * @returns The property value or the default value
 */
export function safeGet<T, K extends keyof T>(obj: T | undefined | null, key: K, defaultValue: T[K]): T[K] {
  if (!obj) return defaultValue
  return obj[key] !== undefined ? obj[key] : defaultValue
}

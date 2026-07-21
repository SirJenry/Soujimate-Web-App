export const DEFAULT_LOGIN_DOMAIN = 'tenseiph.com'

/******************************************************************************/
/* Processing Hierarchy                                                       */
/******************************************************************************/
// normalizeLoginIdentifier (1.0) Convert a username into a work email.

/**
 * <Layer number> (1.0)
 *
 * <Processing name> normalizeLoginIdentifier
 * <Function> Append the default domain when an email domain is omitted.
 *
 * @param {string} identifier Username or complete email address.
 * @param {string} domain Default work email domain.
 * @return {string} Normalized Firebase email address.
 */
export function normalizeLoginIdentifier(
  identifier,
  domain = DEFAULT_LOGIN_DOMAIN,
) {
  const normalized = String(identifier || '').trim().toLowerCase()
  if (!normalized || normalized.includes('@')) return normalized

  return `${normalized}@${domain}`
}

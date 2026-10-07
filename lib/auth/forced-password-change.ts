export function canCompleteForcedPasswordChange(opts: {
  mustChange: boolean;
  recoveryOrInvite: boolean;
}): boolean {
  return opts.mustChange || opts.recoveryOrInvite;
}

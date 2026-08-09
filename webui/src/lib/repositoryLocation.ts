export type RepositoryLocation = "local" | "remote" | "remote-instance";

const REMOTE_BACKENDS = new Set([
  "azure",
  "b2",
  "gs",
  "http",
  "rclone",
  "rest",
  "s3",
  "sftp",
  "swift",
]);

export function repositoryLocation(
  uri: string | undefined,
  originInstanceId: string | undefined,
): RepositoryLocation {
  if (originInstanceId) return "remote-instance";
  const scheme = uri?.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  return scheme && REMOTE_BACKENDS.has(scheme) ? "remote" : "local";
}

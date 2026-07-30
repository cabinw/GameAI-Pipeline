import { open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function atomicWriteFile(
  targetFile,
  data,
  { beforePublish } = {},
) {
  const temporaryFile = path.join(
    path.dirname(targetFile),
    `.${path.basename(targetFile)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;
  let published = false;
  try {
    handle = await open(temporaryFile, "wx");
    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await beforePublish?.(temporaryFile);
    await rename(temporaryFile, targetFile);
    published = true;
  } finally {
    if (handle) {
      await handle.close();
    }
    if (!published) {
      await rm(temporaryFile, { force: true });
    }
  }
}

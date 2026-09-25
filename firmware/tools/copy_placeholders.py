"""PlatformIO pre-script: fill data/ with placeholder audio before building the filesystem.

Runs only for the filesystem targets (buildfs, uploadfs, uploadfsota). For every file in
firmware/placeholders/ that does NOT already exist in data/, a copy is made. Existing files
in data/ (your real audio) are never overwritten.
"""
import os
import shutil

Import("env")  # noqa: F821  (provided by PlatformIO/SCons)

FS_TARGETS = {"buildfs", "uploadfs", "uploadfsota"}


def copy_missing_placeholders():
    project_dir = env.subst("$PROJECT_DIR")  # noqa: F821
    data_dir = env.subst("$PROJECT_DATA_DIR")  # noqa: F821
    src_dir = os.path.join(project_dir, "placeholders")
    if not os.path.isdir(src_dir):
        print("[placeholders] folder not found: %s" % src_dir)
        return
    os.makedirs(data_dir, exist_ok=True)
    for name in sorted(os.listdir(src_dir)):
        if not name.lower().endswith(".wav"):
            continue
        dst = os.path.join(data_dir, name)
        if os.path.exists(dst):
            print("[placeholders] keeping existing data/%s" % name)
            continue
        shutil.copy2(os.path.join(src_dir, name), dst)
        print("[placeholders] copied placeholder -> data/%s" % name)


if FS_TARGETS.intersection(COMMAND_LINE_TARGETS):  # noqa: F821
    copy_missing_placeholders()

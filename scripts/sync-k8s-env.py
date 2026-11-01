#!/usr/bin/env python3
import os
import re

env_file = ".env"
clean_file = ".env.clean"

if not os.path.exists(env_file):
    exit(0)

clean_lines = []
with open(env_file, "r", encoding="utf-8-sig") as f:
    for line in f:
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z0-9_]+)\s*=\s*(.*)$", raw)
        if m:
            k = m.group(1)
            v = m.group(2).strip()
            # If quoted, extract quoted part and strip inline comments
            if v.startswith('"'):
                end_idx = v.find('"', 1)
                v = v[1:end_idx] if end_idx != -1 else v[1:]
            elif v.startswith("'"):
                end_idx = v.find("'", 1)
                v = v[1:end_idx] if end_idx != -1 else v[1:]
            else:
                if " #" in v:
                    v = v.split(" #")[0].strip()
                elif "\t#" in v:
                    v = v.split("\t#")[0].strip()
            clean_lines.append(f"{k}={v}")

with open(clean_file, "w", encoding="utf-8") as out:
    out.write("\n".join(clean_lines) + "\n")

print(f"Generated {clean_file} with {len(clean_lines)} sanitized environment variables.")

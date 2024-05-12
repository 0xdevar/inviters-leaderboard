export function getGitTag() {
	const {stdout} = Bun.spawnSync({
		cmd: ["git", "describe", "--tags", "--abbrev=0"],
		stdout: "pipe",
	});

	return stdout.toString().trim();
}


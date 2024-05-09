export function env(name: string, fallback?: string) {
	const value = process.env[name];

	if (!value && fallback) {
		return fallback;
	}

	if (!value) {
		throw new Error(`${name} is not set in the environment variable`);
	}

	return value;
}

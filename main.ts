export { }; // NOTE: to ensure we can await in top level to supress ts-check

function env(name: string) {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} is not set in the environment variable`);
	}

	return value;
}

const TOKEN = env("DISCORD_TOKEN");
const GUILD_ID = env("GUILD_ID");

function discordEndpoint(url: string) {
	const base = "https://discord.com/api/v9";
	return `${base}/${url}`;
}

async function discordHitendpoint(url: string, method: string, body?: object): Promise<Response> {
	const response = await fetch(url, {
		"headers": {
			"content-type": "application/json",
			"authorization": `Bot ${TOKEN}`,
		},
		"body": JSON.stringify(body),
		"method": method
	});
	return response;
}

interface User {
	id: string;
	username: string;
}

interface Member {
	user: User;
	code?: string;
	invitedBy?: string;
}

interface ActualMemberDTO {
	user: User;
}


interface MemberDTO {
	source_invite_code?: string;
	join_source_type?: number;
	inviter_id?: string;
	member: ActualMemberDTO;
}

interface MemberSearchDTO {
	guild_id: string;
	members: MemberDTO[];
	page_result_count: number;
	total_result_count: number;
}

async function getMembers(guildId: string, limit?: number): Promise<Member[]> {
	const endpoint = discordEndpoint(`guilds/${guildId}/members-search`);

	const members: Member[] = [];
	while (true) {
		const payload = {
			or_query: {},
			and_query: {},
			limit: limit ?? 250,
			after: { guild_joined_at: 1711345859879, user_id: "1217685432561565868" }
		};



		const response = await discordHitendpoint(endpoint, "POST", payload);


		if (response.status !== 200) {
			throw new Error(`api error, response is not 200, it was ${response.status}`);
		}

		const o = (await response.json()) as unknown as MemberSearchDTO;

		for (const member of o.members) {
			const m = {
				user: member.member.user,
				invitedBy: member.inviter_id,
				code: member.source_invite_code
			} as Member;
			members.push(m);
		}

		break;
	}
	return members;
}


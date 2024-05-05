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



async function getMembers(guildId: string, limit?: number): Promise<Member[]> {
	const endpoint = discordEndpoint(`guilds/${guildId}/members-search`);

	const members: Member[] = [];

	const payload: any = {
		or_query: {},
		and_query: {},
		limit: limit ?? 250,
	};
	

	let iteration = 0;

	while (true) {
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

		const lastMember = o.members.at(-1);
		 
		if (!lastMember) {
			break;
		}

		const receieved = iteration++ * payload.limit;

		if (receieved >= o.total_result_count) {
			break;
		}

		const lastMemberId = lastMember.member.user.id;
		const lastMemberJoinDate = lastMember.member.joined_at;

		payload.after = { guild_joined_at: Date.parse(lastMemberJoinDate), user_id: lastMemberId };
	}

	return members;
}

async function getInvites(guildId: string): Promise<Invite[]> {
	const endpoint = discordEndpoint(`guilds/${guildId}/invites`);

	const response = await discordHitendpoint(endpoint, "GET");

	if (response.status !== 200) {
		throw new Error(`api error, response is not 200, it was ${response.status}`);
	}

	const invites = await response.json() as InviteDTO[];

	const invitesOut: Invite[] = [];

	for (const invite of invites) {
		invitesOut.push({
			code: invite.code,
			user: invite.inviter,
		} as Invite);
	}

	return invitesOut;
}

async function getInvitedMembersOnly(guildId: string, limit?: number): Promise<InvitedMember[]> {
	const membersOut = [] as InvitedMember[];

	const invites = await getInvites(guildId);

	const members = await getMembers(guildId, limit);

	const getUserFromInvite: (code: string) => User | undefined = (code: string) => {
		return invites.find(invite => invite.code === code)?.user;
	};

	for (const member of members) {
		let inviterId: string | undefined = member.invitedBy;

		if (!member.code && !member.invitedBy) {
			continue;
		}

		if (member.code && !member.invitedBy) {
			inviterId = getUserFromInvite(member.code)?.id;
		}

		if (!inviterId) {
			continue;
		}

		membersOut.push({
			code: member.code,
			user: member.user,
			invitedBy: inviterId,
		} as InvitedMember);
	}


	return membersOut;
}



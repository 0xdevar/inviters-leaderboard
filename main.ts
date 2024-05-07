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


// NOTE: This function grab all users from the server then add it
// to an array on memory which might be unideal for big server with many many members
// better to make this function as generator to load data on demand.
async function getMembers(guildId: string, limit?: number): Promise<Member[]> {
	const endpoint = discordEndpoint(`guilds/${guildId}/members-search`);

	const members: Member[] = [];

	const totalAllowedLimitByEndpoint = 1000;

	const endpointLimit = Math.min(limit ?? totalAllowedLimitByEndpoint, totalAllowedLimitByEndpoint);

	const payload: any = {
		or_query: {},
		and_query: {},
		limit: endpointLimit,
	};

	let receieved = 0;

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

		receieved += o.page_result_count;

		if (!limit) {
			limit = o.total_result_count;
		}

		if (receieved >= limit) {
			break;
		}

		if (receieved >= o.total_result_count) {
			break;
		}

		const remaining = limit - receieved;
		payload.limit = remaining;

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

	function getUserFromInviteFromCode(code: string): undefined | User {
		return invites.find(invite => invite.code === code)?.user;
	}

	for (const member of members) {
		let inviterId: string | undefined = member.invitedBy;

		if (!member.code && !member.invitedBy) {
			continue;
		}

		if (member.code && !member.invitedBy) {
			inviterId = getUserFromInviteFromCode(member.code)?.id;
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

function accoumlateInviters(members: InvitedMember[]): InviterMember[] {
	const invitersMap: { [key: string]: number } = {};
	const inviterMembers = members.reduce(function(results: InviterMember[], value: InvitedMember) {
		const id = value.invitedBy.toString();
		if (invitersMap[id] === undefined) {
			results.push({
				userId: id,
				membersJoinedCount: 0,
			} as InviterMember);
			invitersMap[value.invitedBy] = results.length - 1;
		}

		results[invitersMap[id]].membersJoinedCount++;
		return results;
	}, []);

	return inviterMembers;
}

async function getTopInviters(guildId: string, max: number): Promise<InviterMember[]> {
	const members = await getInvitedMembersOnly(guildId);
	const inviters = accoumlateInviters(members);

	const sortedInviters = inviters.sort((b, a) => a.membersJoinedCount - b.membersJoinedCount);


	return sortedInviters.slice(0, max);
}


async function sendMessage(channelId: string, content: string, embeds?: Embed): Promise<string> {
	const endpoint = discordEndpoint(`/channels/${channelId}/messages`);

	const payload = {
		tts: false,
		content,
		embeds,
	};

	const response = await discordHitendpoint(endpoint, "POST", payload);

	if (![200, 201].includes(response.status)) {
		throw new Error(`api error, response is not [200,201], it was ${response.status}`);
	}

	const o = await response.json() as MessageCreateResponseDTO;

	return o.id;
}


async function editMessage(channelId: string, messageId: string, { content, embeds }: { content: string, embeds?: Embed[] }): Promise<string> {
	if (!content?.length || content.length > 200) {
		throw new Error(`Message exceed the limit ${content.length}`);
	}

	const endpoint = discordEndpoint(`/channels/${channelId}/messages/${messageId}`);

	const payload = {
		content,
		embeds
	};

	const response = await discordHitendpoint(endpoint, "PATCH", payload);

	if (![200, 201].includes(response.status)) {
		throw new Error(`api error, response is not [200,201], it was ${response.status}`);
	}

	const o = await response.json() as MessageCreateResponseDTO;

	return o.id;
}

async function deleteMessage(channelId: string, messageId: string): Promise<void> {
	const endpoint = discordEndpoint(`/channels/${channelId}/messages/${messageId}`)

	const response = await discordHitendpoint(endpoint, "DELETE");

	if (response.status === 204) {
		return;
	}

	throw new Error(`api error, response is not [204], it was ${response.status}`);
}


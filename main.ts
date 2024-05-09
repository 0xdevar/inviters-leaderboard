import * as api from "./api";
import { env } from "./utils";


const GUILD_ID = env("GUILD_ID");
const CHANNEL_ID = env("CHANNEL_ID");
const INTERVAL = parseInt(env("POSTING_INTERVAL", "5")) * 1000;

const store: { [key: string]: any } = {};

function getRandomElementFromArray<T>(array: T[]): undefined | T {
	const randomIndex = Math.floor(Math.random() * array.length) % array.length;
	return array[randomIndex]
}

async function getJsonFile<T>(filePath: string): Promise<T> {
	const f = Bun.file(filePath);
	if (!await f.exists()) {
		throw new Error(`File is not exist ${filePath}.`);
	}

	try {
		const content = await f.json() as T;
		return content;
	} catch {
		throw new Error(`Unable to parse json file ${filePath}`);
	}
}

async function getMessageTemplates(): Promise<Template[]> {
	const templates = await getJsonFile<Template[]>("./templates.json");
	if (templates.length < 1) {
		throw new Error("There is no message templates");
	}
	return templates;
}

async function getRandomTemplate(): Promise<Template> {
	const templates = await getMessageTemplates();
	return getRandomElementFromArray(templates)!;
}

function hydrateInviterEmbed(member: Member, embeds: Embed[], renderedTemplate: string) {
	const avatarId = member.avatar ?? member.user.avatar ?? "";

	for (const e of embeds) {
		e.description = e.description?.replace("{template}", renderedTemplate);


		if (e.author) {
			e.author.name = e.author.name.replace("{user}", member.user.global_name ?? "");

			const args: [string, string] = ["{avatar_url}", api.getMemberAvatar(member.user.id, avatarId)];

			e.author.url = e.author?.url?.replace(...args);
			e.author.icon_url = e.author?.icon_url?.replace(...args);
		}
	}
}

async function postMessageRandom(template: Template) {
	const count = template.maxMembersCount ?? 5;
	const [topInviters, members] = (await api.getTopInviters(GUILD_ID, count));

	const min = (() => {
		const min = template.min;
		if (min && min > topInviters[0].membersJoinedCount) {
			return topInviters[0].membersJoinedCount;
		}
		return template.min;
	})();

	const [inviter, member]: [InviterMember?, Member?] = (() => {
		let member: InviterMember | undefined;
		let guildMember: Member;

		do {

			member = getRandomElementFromArray(topInviters);

			if (!member) {
				console.log("could not find any members", members.length)
				break;
			}

			if (store["random.last"] === member.userId) {
				continue;
			}

			const m = members.find((m: Member) => member?.userId === m.user.id);
			if (!m) {
				continue;
			}

			guildMember = m;

			if (min && member.membersJoinedCount >= min) {
				return [member, guildMember];
			}
		} while (true);

		return [];
	})();

	if (!member || !inviter) {
		return;
	}

	store["random.last"] = inviter.userId;

	const hydrate = (value: string) => {
		return value.replace("{mention}", inviter.mention)
			.replace("{user}", member.user.global_name ?? member.user.username)
			.replace("{count}", inviter.membersJoinedCount.toString());
	}

	const renderedTemplate = hydrate(template.template);

	const embeds = ((embeds) => {
		if (!embeds) {
			return
		}

		hydrateInviterEmbed(member, embeds, renderedTemplate);


		return embeds
	})(template.embeds);

	await api.sendMessage(CHANNEL_ID, template.content, embeds);
}

async function postMessageFromRandomTemplate() {
	const template = await getRandomTemplate();

	if (template.type === "seq") {
		throw new Error("is not supported yet");
		// return postMessageSeq(template);
	} else if (template.type === "random") {
		return postMessageRandom(template);
	}
}

async function mainLoop() {
	await postMessageFromRandomTemplate();
}

mainLoop();
setInterval(mainLoop, INTERVAL);

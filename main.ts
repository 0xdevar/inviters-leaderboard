import * as api from "./api.ts";
import { env, randomColor } from "./utils.ts";


const GUILD_ID = env("GUILD_ID");
const CHANNEL_ID = env("CHANNEL_ID");
const INTERVAL = parseInt(env("POSTING_INTERVAL", "360")) * (1000 * 60);

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

	const MEMBERS_KEY = "random.last.members";

	if (!Array.isArray(store[MEMBERS_KEY])) {
		store[MEMBERS_KEY] = [];
	}

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
				break;
			}

			if (store[MEMBERS_KEY].includes(member.userId)) {
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

	if (store[MEMBERS_KEY].length > 3) {
		store[MEMBERS_KEY].shift();
	}

	store[MEMBERS_KEY].push(inviter.userId);

	const hydrate = (value: string) => {
		return value.replace("{mention}", inviter.mention)
			.replace("{user}", member.user.global_name ?? member.user.username)
			.replace("{count}", inviter.membersJoinedCount.toString());
	}

	const renderedTemplate = hydrate(template.template);

	if (template.content) {
		template.content = hydrate(template.content);
	}

	const embeds = ((embeds) => {
		if (!embeds) {
			return
		}

		hydrateInviterEmbed(member, embeds, renderedTemplate);

		return embeds
	})(template.embeds);

	if (embeds) {
		const color = member.user.accent_color ?? randomColor();
		embeds[0].color = color;
		if (embeds[0].image) {
			embeds[0].image.url = embeds[0].image?.url
				.replace("{count}", inviter.membersJoinedCount.toString())
				.replace("{color}", color.toString(16).padStart(6, "0"))
		}
	}

	await api.sendMessage(CHANNEL_ID, template.content, embeds);
}

async function shouldSend(): Promise<boolean> {
	const messages = await api.getMessages(CHANNEL_ID, {
		limit: 8
	});

	const wasOneOfThemFromBot = !!messages.find(m => m.author?.bot);

	return !wasOneOfThemFromBot;
}

async function postMessageFromRandomTemplate() {
	const template = await getRandomTemplate();

	if (!await shouldSend()) {
		console.log(`Skipping ${new Date()}`);
		return;
	}


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

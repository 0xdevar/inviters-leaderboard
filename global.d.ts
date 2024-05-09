export { }

declare global {
	interface User {
		id: string;
		username: string;
		global_name?: string;
		avatar?: string;
		accent_color?: number;
	}

	interface Member {
		user: User;
		code?: string;
		invitedBy?: string;
		avatar?: string;
		nick?: string;
		joined_at: string;
		permissions?: string;
	}

	interface InvitedMember {
		user: User;
		code: string;
		invitedBy: string;
	}

	interface ActualMemberDTO {
		user: User;
		joined_at: string;
		avatar?: string;
		nick?: string;
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

	interface InviteDTO {
		code: string;
		inviter?: User;
	}

	interface Invite {
		code: string;
		user?: User;
	}

	interface InviterMember {
		userId: string;
		mention: string;
		membersJoinedCount: number;
	}

	interface MessageCreateResponseDTO {
		id: string;
		channel_id: string;
	}

	interface Embed {
		title?: string;
		type?: "rich" | "image" | "video" | "gifv" | "article" | "link"; // type will always be "rich" for webhook embeds
		description?: string;
		url?: string;
		timestamp?: string;
		color?: number;
		footer?: EmbedFooter;
		image?: EmbedImage;
		thumbnail?: EmbedThumbnail;
		video?: EmbedVideo;
		provider?: EmbedProvider;
		author?: EmbedAuthor;
		fields?: EmbedField[];
	}

	interface EmbedFooter {
		text: string;
		icon_url?: string;
		proxy_icon_url?: string;
	}

	interface EmbedImage {
		url: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	}

	interface EmbedThumbnail {
		url: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	}

	interface EmbedVideo {
		url?: string;
		proxy_url?: string;
		height?: number;
		width?: number;
	}

	interface EmbedProvider {
		name?: string;
		url?: string;
	}

	interface EmbedAuthor {
		name: string;
		url?: string;
		icon_url?: string;
		proxy_icon_url?: string;
	}

	interface EmbedField {
		name: string;
		value: string;
		inline?: boolean;
	}

	interface Template {
		template: string;
		type: "seq" | "random";
		maxMembersCount?: number;
		min?: number;
		content?: string;
		embeds?: Embed[];
	}
}


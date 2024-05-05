export { }

declare global {
	interface User {
		id: string;
		username: string;
	}

	interface Member {
		user: User;
		code?: string;
		invitedBy?: string;
	}

	interface InvitedMember {
		user: User;
		code: string;
		invitedBy: string;
	}

	interface ActualMemberDTO {
		user: User;
		joined_at: string;
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
}

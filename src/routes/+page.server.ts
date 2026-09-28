import { fail, redirect } from '@sveltejs/kit';
import { desc, eq, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';

import {
	organizations,
	profiles,
	projects,
	quotes,
	invoices,
	documents,
	conversations,
	messages
} from '$lib/server/db/schema';

import { createSupabaseServerClient } from '$lib/server/supabase';


/*
|--------------------------------------------------------------------------
| LOAD
|--------------------------------------------------------------------------
*/

export const load = async ({ locals, cookies }) => {
	/*
	 * ---------------------------------------------------------
	 * AUTHENTICATION
	 * ---------------------------------------------------------
	 */

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const supabase = createSupabaseServerClient(cookies);

	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		throw redirect(303, '/login');
	}


	/*
	 * ---------------------------------------------------------
	 * PROFILE
	 * ---------------------------------------------------------
	 */

	const [profile] = await db
		.select()
		.from(profiles)
		.where(eq(profiles.id, user.id))
		.limit(1);

	/*
	 * The Supabase account can exist before
	 * the profile row has been created.
	 */

	if (!profile) {
		return {
			user,
			profile: null,
			organization: null,
			projects: [],
			quotes: [],
			invoices: [],
			documents: [],
			messages: []
		};
	}


	/*
	 * ---------------------------------------------------------
	 * ORGANIZATION
	 * ---------------------------------------------------------
	 */

	const [organization] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, profile.organizationId))
		.limit(1);

	const organizationId = profile.organizationId;


	/*
	 * ---------------------------------------------------------
	 * WORKSPACE DATA
	 * ---------------------------------------------------------
	 */

	const [
		projectRows,
		quoteRows,
		invoiceRows,
		documentRows,
		conversationRows
	] = await Promise.all([
		db
			.select()
			.from(projects)
			.where(eq(projects.organizationId, organizationId))
			.orderBy(desc(projects.createdAt)),

		db
			.select()
			.from(quotes)
			.where(eq(quotes.organizationId, organizationId))
			.orderBy(desc(quotes.createdAt)),

		db
			.select()
			.from(invoices)
			.where(eq(invoices.organizationId, organizationId))
			.orderBy(desc(invoices.issuedAt)),

		db
			.select()
			.from(documents)
			.where(eq(documents.organizationId, organizationId))
			.orderBy(desc(documents.createdAt)),

		db
			.select()
			.from(conversations)
			.where(eq(conversations.organizationId, organizationId))
			.orderBy(desc(conversations.createdAt))
	]);


	/*
	 * ---------------------------------------------------------
	 * MESSAGES
	 * ---------------------------------------------------------
	 */

	const conversationIds = conversationRows.map(
		(conversation) => conversation.id
	);

	const messageRows =
		conversationIds.length > 0
			? await db
					.select()
					.from(messages)
					.where(
						inArray(
							messages.conversationId,
							conversationIds
						)
					)
					.orderBy(desc(messages.createdAt))
			: [];


	/*
	 * Attach the conversation to every message.
	 */

	const messagesWithConversation = messageRows.map((message) => ({
		...message,

		conversation:
			conversationRows.find(
				(conversation) =>
					conversation.id === message.conversationId
			) ?? null
	}));


	/*
	 * ---------------------------------------------------------
	 * RETURN DATA TO +PAGE.SVELTE
	 * ---------------------------------------------------------
	 */

	return {
		user,
		profile,
		organization,

		projects: projectRows,

		quotes: quoteRows,

		invoices: invoiceRows,

		documents: documentRows,

		messages: messagesWithConversation
	};
};


/*
|--------------------------------------------------------------------------
| ACTIONS
|--------------------------------------------------------------------------
*/

export const actions = {

	/*
	 * =========================================================
	 * CREATE PROJECT
	 * =========================================================
	 */

	createProject: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();

		const name = String(
			formData.get('name') ?? ''
		).trim();

		const description = String(
			formData.get('description') ?? ''
		).trim();

		const dueDateValue = String(
			formData.get('dueDate') ?? ''
		).trim();

		const leadName = String(
			formData.get('leadName') ?? ''
		).trim();


		/*
		 * -----------------------------------------------------
		 * VALIDATION
		 * -----------------------------------------------------
		 */

		if (!name) {
			return fail(400, {
				error: 'Project name is required.'
			});
		}

		if (name.length > 160) {
			return fail(400, {
				error: 'Project name is too long.'
			});
		}

		if (description.length > 4000) {
			return fail(400, {
				error: 'Project description is too long.'
			});
		}

		if (leadName.length > 120) {
			return fail(400, {
				error: 'Project lead name is too long.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * GET PROFILE
		 * -----------------------------------------------------
		 */

		const [profile] = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, locals.user.id))
			.limit(1);

		if (!profile) {
			return fail(403, {
				error:
					'Your client profile could not be found.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * CREATE PROJECT CODE
		 * -----------------------------------------------------
		 */

		const code =
			`REQ-${Date.now()}`;


		/*
		 * -----------------------------------------------------
		 * DUE DATE
		 * -----------------------------------------------------
		 */

		let dueDate: Date | null = null;

		if (dueDateValue) {
			const parsedDate = new Date(dueDateValue);

			if (Number.isNaN(parsedDate.getTime())) {
				return fail(400, {
					error: 'Please enter a valid due date.'
				});
			}

			dueDate = parsedDate;
		}


		/*
		 * -----------------------------------------------------
		 * INSERT PROJECT
		 * -----------------------------------------------------
		 */

		const [project] = await db
			.insert(projects)
			.values({
				organizationId: profile.organizationId,

				code,

				name,

				description:
					description || null,

				status: 'planning',

				progress: 0,

				dueDate,

				leadName:
					leadName || null
			})
			.returning();


		return {
			success: true,

			action: 'createProject',

			message:
				'Project request submitted successfully.',

			project
		};
	},


	/*
	 * =========================================================
	 * REQUEST QUOTE
	 * =========================================================
	 */

	requestQuote: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData =
			await request.formData();

		const title = String(
			formData.get('title') ?? ''
		).trim();

		const details = String(
			formData.get('details') ?? ''
		).trim();


		/*
		 * -----------------------------------------------------
		 * VALIDATION
		 * -----------------------------------------------------
		 */

		if (!title) {
			return fail(400, {
				error:
					'Quote request title is required.'
			});
		}

		if (title.length > 200) {
			return fail(400, {
				error:
					'Quote request title is too long.'
			});
		}

		if (details.length > 4000) {
			return fail(400, {
				error:
					'Quote request details are too long.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * GET PROFILE
		 * -----------------------------------------------------
		 */

		const [profile] = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, locals.user.id))
			.limit(1);

		if (!profile) {
			return fail(403, {
				error:
					'Your client profile could not be found.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * CREATE QUOTE REFERENCE
		 * -----------------------------------------------------
		 */

		const reference =
			`QUOTE-${Date.now()}`;


		/*
		 * -----------------------------------------------------
		 * CREATE QUOTE
		 * -----------------------------------------------------
		 *
		 * The current quotes table does not have a
		 * description/details column.
		 *
		 * Therefore:
		 *
		 * title  -> quotes.title
		 * details -> conversation message
		 *
		 * The amount starts at 0 until Origins
		 * creates the actual quotation.
		 */

		const [quote] = await db
			.insert(quotes)
			.values({
				organizationId:
					profile.organizationId,

				reference,

				title,

				amount: '0',

				status: 'draft'
			})
			.returning();


		/*
		 * -----------------------------------------------------
		 * FIND LATEST CONVERSATION
		 * -----------------------------------------------------
		 */

		const [existingConversation] = await db
			.select()
			.from(conversations)
			.where(
				eq(
					conversations.organizationId,
					profile.organizationId
				)
			)
			.orderBy(
				desc(conversations.createdAt)
			)
			.limit(1);


		let conversation =
			existingConversation;


		/*
		 * -----------------------------------------------------
		 * CREATE CONVERSATION IF NEEDED
		 * -----------------------------------------------------
		 */

		if (!conversation) {
			const [createdConversation] =
				await db
					.insert(conversations)
					.values({
						organizationId:
							profile.organizationId,

						subject:
							'Quote requests'
					})
					.returning();

			conversation =
				createdConversation;
		}


		/*
		 * -----------------------------------------------------
		 * SAVE DETAILS AS MESSAGE
		 * -----------------------------------------------------
		 */

		const messageBody = details
			? `Quote request: ${title}\n\nDetails:\n${details}`
			: `Quote request: ${title}`;


		await db
			.insert(messages)
			.values({
				conversationId:
					conversation.id,

				senderId:
					locals.user.id,

				body:
					messageBody
			});


		return {
			success: true,

			action: 'requestQuote',

			message:
				'Quote request sent successfully.',

			quote
		};
	},


	/*
	 * =========================================================
	 * NEW CLIENT REQUEST
	 * =========================================================
	 */

	newRequest: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData =
			await request.formData();

		const subject = String(
			formData.get('subject') ?? ''
		).trim();

		const body = String(
			formData.get('body') ?? ''
		).trim();

		const projectId = String(
			formData.get('projectId') ?? ''
		).trim();


		/*
		 * -----------------------------------------------------
		 * VALIDATION
		 * -----------------------------------------------------
		 */

		if (!subject) {
			return fail(400, {
				error:
					'Request subject is required.'
			});
		}

		if (subject.length > 200) {
			return fail(400, {
				error:
					'Request subject is too long.'
			});
		}

		if (!body) {
			return fail(400, {
				error:
					'Please describe your request.'
			});
		}

		if (body.length > 4000) {
			return fail(400, {
				error:
					'Request details cannot exceed 4000 characters.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * GET PROFILE
		 * -----------------------------------------------------
		 */

		const [profile] = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, locals.user.id))
			.limit(1);

		if (!profile) {
			return fail(403, {
				error:
					'Your client profile could not be found.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * VALIDATE PROJECT IF PROVIDED
		 * -----------------------------------------------------
		 */

		let validProjectId: string | null =
			projectId || null;

		if (validProjectId) {
			const [project] = await db
				.select()
				.from(projects)
				.where(
					eq(
						projects.id,
						validProjectId
					)
				)
				.limit(1);

			if (
				!project ||
				project.organizationId !==
					profile.organizationId
			) {
				return fail(400, {
					error:
						'The selected project is not available.'
				});
			}
		}


		/*
		 * -----------------------------------------------------
		 * CREATE CONVERSATION
		 * -----------------------------------------------------
		 */

		const [conversation] =
			await db
				.insert(conversations)
				.values({
					organizationId:
						profile.organizationId,

					projectId:
						validProjectId,

					subject
				})
				.returning();


		/*
		 * -----------------------------------------------------
		 * CREATE FIRST MESSAGE
		 * -----------------------------------------------------
		 */

		await db
			.insert(messages)
			.values({
				conversationId:
					conversation.id,

				senderId:
					locals.user.id,

				body
			});


		return {
			success: true,

			action: 'newRequest',

			message:
				'Your request has been sent successfully.',

			conversation
		};
	},


	/*
	 * =========================================================
	 * SEND MESSAGE
	 * =========================================================
	 */

	sendMessage: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData =
			await request.formData();

		const body = String(
			formData.get('body') ?? ''
		).trim();


		/*
		 * -----------------------------------------------------
		 * VALIDATION
		 * -----------------------------------------------------
		 */

		if (!body) {
			return fail(400, {
				error:
					'Please enter a message.'
			});
		}

		if (body.length > 4000) {
			return fail(400, {
				error:
					'Message cannot exceed 4000 characters.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * GET PROFILE
		 * -----------------------------------------------------
		 */

		const [profile] = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, locals.user.id))
			.limit(1);

		if (!profile) {
			return fail(403, {
				error:
					'Your client profile could not be found.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * FIND LATEST CONVERSATION
		 * -----------------------------------------------------
		 */

		const [existingConversation] =
			await db
				.select()
				.from(conversations)
				.where(
					eq(
						conversations.organizationId,
						profile.organizationId
					)
				)
				.orderBy(
					desc(conversations.createdAt)
				)
				.limit(1);


		let conversation =
			existingConversation;


		/*
		 * -----------------------------------------------------
		 * CREATE CONVERSATION IF NEEDED
		 * -----------------------------------------------------
		 */

		if (!conversation) {
			const [createdConversation] =
				await db
					.insert(conversations)
					.values({
						organizationId:
							profile.organizationId,

						subject:
							'Client workspace'
					})
					.returning();

			conversation =
				createdConversation;
		}


		/*
		 * -----------------------------------------------------
		 * INSERT MESSAGE
		 * -----------------------------------------------------
		 */

		await db
			.insert(messages)
			.values({
				conversationId:
					conversation.id,

				senderId:
					locals.user.id,

				body
			});


		return {
			success: true,

			action: 'sendMessage',

			message:
				'Message sent successfully.'
		};
	},


	/*
	 * =========================================================
	 * LOGOUT
	 * =========================================================
	 */

	logout: async ({ cookies }) => {
		/*
		 * IMPORTANT:
		 *
		 * Do NOT use:
		 *
		 * locals.supabase
		 *
		 * because your Locals type does not
		 * contain a supabase property.
		 */

		const supabase =
			createSupabaseServerClient(
				cookies
			);

		await supabase.auth.signOut();

		throw redirect(
			303,
			'/login'
		);
	},


	/*
	 * =========================================================
	 * SAVE PROFILE
	 * =========================================================
	 */

	saveProfile: async ({
		request,
		locals
	}) => {
		if (!locals.user) {
			throw redirect(
				303,
				'/login'
			);
		}

		const formData =
			await request.formData();

		const name = String(
			formData.get('name') ?? ''
		).trim();


		/*
		 * -----------------------------------------------------
		 * VALIDATION
		 * -----------------------------------------------------
		 */

		if (!name) {
			return fail(400, {
				error:
					'Name cannot be empty.'
			});
		}

		if (name.length > 120) {
			return fail(400, {
				error:
					'Name cannot exceed 120 characters.'
			});
		}


		/*
		 * -----------------------------------------------------
		 * UPDATE PROFILE
		 * -----------------------------------------------------
		 */

		await db
			.update(profiles)
			.set({
				fullName: name
			})
			.where(
				eq(
					profiles.id,
					locals.user.id
				)
			);


		return {
			success: true,

			action: 'saveProfile',

			message:
				'Profile updated successfully.'
		};
	}
};
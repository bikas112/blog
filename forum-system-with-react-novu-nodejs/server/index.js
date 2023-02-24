const express = require("express");
const { Novu } = require("@novu/node");
const novu = new Novu("<YOUR_API_KEY>");
const cors = require("cors");
const app = express();
const PORT = 4000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const users = [];
const threadList = [];

const generateID = () => Math.random().toString(36).substring(2, 10);

app.post("/api/login", (req, res) => {
	const { email, password } = req.body;
	let result = users.filter(
		(user) => user.email === email && user.password === password
	);

	if (result.length !== 1) {
		return res.json({
			error_message: "Incorrect credentials",
		});
	}

	res.json({
		message: "Login successfully",
		username: result[0].username,
	});
});

app.post("/api/register", async (req, res) => {
	const { email, password, username } = req.body;
	let id = generateID();
	let result = users.filter(
		(user) => user.email === email && user.password === password
	);

	if (result.length === 0) {
		const newUser = { id, email, password, username };
		await novu.subscribers.identify(id, { email: email });
		users.push(newUser);
		return res.json({
			message: "Account created successfully!",
			users,
		});
	}
	res.json({
		error_message: "User already exists",
	});
});

app.post("/api/create/thread", async (req, res) => {
	const { thread, username } = req.body;
	let id = generateID();
	threadList.unshift({
		id,
		title: thread,
		username,
		replies: [],
		likes: [],
	});
	const getUserId = users.filter((user) => user.username === username);

	await novu.topics.create({
		key: id,
		name: thread,
	});

	await novu.topics.addSubscribers(id, {
		subscribers: [getUserId[0].id],
		//replace with your subscriber ID to test run
		// subscribers: ["<YOUR_SUBSCRIBER_ID>"],
	});

	res.json({
		message: "Thread created successfully!",
		threads: threadList,
	});
});

app.get("/api/all/threads", (req, res) => {
	res.json({
		threads: threadList,
	});
});

app.post("/api/thread/like", (req, res) => {
	const { threadId, userId } = req.body;
	const result = threadList.filter((thread) => thread.id === threadId);
	const threadLikes = result[0].likes;
	const authenticateReaction = threadLikes.filter(
		(thread) => thread === userId
	);
	if (authenticateReaction.length === 0) {
		threadLikes.push(userId);
		return res.json({
			message: "You've reacted to the post!",
		});
	}
	res.json({
		error_message: "You can only react once!",
	});
});

app.post("/api/thread/replies", (req, res) => {
	const { id } = req.body;
	const result = threadList.filter((thread) => thread.id === id);
	res.json({
		replies: result[0].replies,
		title: result[0].title,
	});
});

app.post("/api/create/reply", async (req, res) => {
	const { id, userId, reply } = req.body;
	const result = threadList.filter((thread) => thread.id === id);
	const username = users.filter((user) => user.username === userId);
	result[0].replies.unshift({ name: username[0].username, text: reply });

	await novu.trigger("topicnotification", {
		to: [{ type: "Topic", topicKey: id }],
	});

	res.json({
		message: "Response added successfully!",
	});
});

app.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});
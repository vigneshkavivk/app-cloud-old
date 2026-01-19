// server/controllers/githubController.js
import axios from "axios";
import User from "../models/User.js";
import Register from "../models/RegisterModel.js";

export const connectWithToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${token}` },
    });

    return res.json(response.data);
  } catch (err) {
    console.error("❌ Error validating token:", err.message);
    return res
      .status(err.response?.status || 500)
      .json({ error: "Failed to connect with token", details: err.response?.data || err.message });
  }
};
export const getGithubConnectionStatus = async (req, res) => {
  try {
    const user = await Register.findById(req.user?._id, 'githubToken');
    if (!user) return res.status(404).json({ connected: false });

    res.json({
      connected: !!user.githubToken
    });
  } catch (err) {
    console.error('[GitHubStatus] DB error:', err);
    res.status(500).json({ connected: false });
  }
};
export const getGithubRepos = async (req, res) => {
  const { token, org } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    let url;
    if (org) {
      url = `https://api.github.com/orgs/${org}/repos`;
    } else {
      url = `https://api.github.com/user/repos`;
    }

    const response = await axios.get(url, {
      headers: { Authorization: `token ${token}` },
    });

    return res.json(response.data);
  } catch (err) {
    console.error("❌ Error fetching repos:", err.message);
    return res
      .status(err.response?.status || 500)
      .json({ error: "Failed to fetch repos", details: err.response?.data || err.message });
  }
};

// ✅ UPDATED: Now reads from req.body (to support POST /scm/fetch-folders)
export const getRepoFolders = async (req, res) => {
  const { owner, repo, githubToken } = req.body; // ← Changed from req.params & req.query

  if (!githubToken || !owner || !repo) {
    return res.status(400).json({ error: "Missing githubToken, owner, or repo in request body" });
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/`;

    const response = await axios.get(url, {
      headers: { Authorization: `token ${githubToken}` },
    });

    const folders = response.data.filter((item) => item.type === "dir");

    return res.json(folders);
  } catch (err) {
    console.error("❌ Error fetching repo folders:", err.message);
    return res
      .status(err.response?.status || 500)
      .json({ error: "Failed to fetch repo folders", details: err.response?.data || err.message });
  }
};

export const getFileContent = async (req, res) => {
  const { owner, repo, path } = req.params;
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const response = await axios.get(url, {
      headers: { Authorization: `token ${token}` },
    });

    const fileContent = Buffer.from(response.data.content, "base64").toString();

    return res.json({ name: response.data.name, content: fileContent });
  } catch (err) {
    console.error("❌ Error fetching file content:", err.message);
    return res
      .status(err.response?.status || 500)
      .json({ error: "Failed to fetch file", details: err.response?.data || err.message });
  }
};

export const saveFile = async (req, res) => {
  const { owner, repo } = req.params;
  const { path, content, message, token } = req.body;

  if (!token || !path || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let sha;
    try {
      const fileResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { headers: { Authorization: `token ${token}` } }
      );
      sha = fileResponse.data.sha;
    } catch {
      sha = undefined;
    }

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message: message || "Updated via API",
        content: Buffer.from(content).toString("base64"),
        sha,
      },
      {
        headers: { Authorization: `token ${token}` },
      }
    );

    return res.json(response.data);
  } catch (err) {
    console.error("❌ Error saving file:", err.message);
    return res
      .status(err.response?.status || 500)
      .json({ error: "Failed to save file", details: err.response?.data || err.message });
  }
};

export const getClientToken = async (req, res) => {
  const { clientId } = req.params;

  try {
    const client = await User.findById(clientId);

    if (!client || !client.githubToken) {
      return res.status(404).json({ error: "Token not found for this client" });
    }

    res.json({
      clientId: client._id,
      token: client.githubToken
    });
  } catch (err) {
    console.error("Error fetching client token:", err);
    res.status(500).json({ error: "Server error" });
  }
};

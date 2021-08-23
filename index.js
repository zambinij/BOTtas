const { Client, Intents } = require('discord.js');
const dotenv = require('dotenv');
// const fetch = require('node-fetch');
const { setHeader, GraphQLClient } = require('graphql-request');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

dotenv.config();

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
  console.log(`Logged in as ${client.user.tag}!`);

  // client.channels.fetch('879298364263505931')
  //   .then(channel => channel.send('HERE'));
});

client.on('messageCreate', message => {
  if (message.content === 'ping') {
    message.channel.send('pong');
  }
});

const fetchGitlab = async () => {
  const query = `
      query {
          projects(membership: true) {
              nodes {
                  description
                  fullPath
                  id
                  mergeRequests(state: opened) {
                      nodes {
                          id
                          createdAt
                          discussions {
                              nodes {
                                  id
                                  createdAt
                                  notes {
                                      nodes {
                                          id
                                          body
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
          }
      }
  `;

  const gitlabClient = new GraphQLClient('https://gitlab.com/api/graphql');
  gitlabClient.setHeader('authorization', `Bearer ${process.env.GITLAB_ACCESS_TOKEN}`);

  const data = await gitlabClient.request(query);

  const projects = data.projects.nodes;
  const mergeRequests = projects.map(project => project.mergeRequests.nodes).filter();
  const discussions = mergeRequests.map(mergeRequest => mergeRequest);

  console.log(discussions);
}

fetchGitlab();

client.on('error', err => {
  console.warn(err);
});

client.login(process.env.BOT_TOKEN);

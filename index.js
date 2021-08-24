const { Client, Intents, MessageEmbed } = require('discord.js');
const dotenv = require('dotenv');
const { GraphQLClient, gql } = require('graphql-request');
const { addDays, differenceInDays, format } = require('date-fns');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

dotenv.config();
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const channel = guild.channels.cache.get(process.env.CHANNEL_ID);

  await fetchGitlab(channel);
});

const isPastThreshold = (mergeRequest) => {
  const threshold = process.env.THRESHOLD_DAYS;

  return (
    differenceInDays(new Date(), new Date(mergeRequest.updatedAt)) > threshold
  );
};

const processInformation = (channel, data) => {
  const projects = data.projects.nodes;

  const mergeRequestsPastThreshold = projects
    .map((project) => {
      return project.mergeRequests.nodes
        .filter((mergeRequest) => mergeRequest.draft === false)
        .flatMap((mergeRequest) => {
          return isPastThreshold(mergeRequest) ? mergeRequest : [];
        })
        .filter(Boolean);
    })
    .flat();

  mergeRequestsPastThreshold.forEach((mergeRequest) =>
    sendEmbed(channel, mergeRequest)
  );
};

const sendEmbed = async (channel, mergeRequest) => {
  const embed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle(mergeRequest.title)
    .setURL(mergeRequest.webUrl)
    .setDescription(mergeRequest.description)
    .setThumbnail(`https://gitlab.com/${mergeRequest.author.avatarUrl}`)
    .addFields(
      { name: 'Author: ', value: mergeRequest.author.name },
      {
        name: 'Last update: ',
        value: format(new Date(mergeRequest.updatedAt), 'dd/LL/yyyy'),
      }
    );

  channel.send({ embeds: [embed] });
};

const fetchGitlab = async (channel) => {
  const projectIds = process.env.PROJECT_IDS.split(',').map(
    (id) => `gid://gitlab.com/Project/${id}`
  );

  const query = gql`
    query ($ids: [ID!]) {
      projects(membership: true, ids: $ids) {
        nodes {
          description
          fullPath
          id
          mergeRequests(state: opened) {
            nodes {
              id
              createdAt
              updatedAt
              webUrl
              title
              draft
              description
              author {
                name
                avatarUrl
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    ids: projectIds,
  };

  const gitlabClient = new GraphQLClient('https://gitlab.com/api/graphql');
  gitlabClient.setHeader(
    'authorization',
    `Bearer ${process.env.GITLAB_ACCESS_TOKEN}`
  );

  const data = await gitlabClient.request(query, variables);

  processInformation(channel, data);
};

client.on('error', (err) => {
  console.warn(err);
});

client.login(process.env.BOT_TOKEN);

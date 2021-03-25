const Participant = require("../../models/participant");
const Team = require("../../models/team");
const {
  prefix,
  participantTeamNamePrefix,
  registerChannel,
  teamsEvaluateRoleid,
} = require("../config");

const { embeds, errorEmbed, warnEmbed } = require("../util");

const { allowedInChannel, createMiddlewarePipeline } = require("../util");
const { validateEmail } = require("../validators");

module.exports = {
  name: "register",
  description: `Lets you register for discord!`,
  usage: `${prefix}register [your registered email]\nNote: This command only works in the ${registerChannel.name} channel.\n`,
  aliases: ["reg"],

  execute: (message, args) =>
    createMiddlewarePipeline(allowedInChannel(registerChannel), execute)(
      message,
      args
    ),
};

async function execute(message, args) {
  if (!args.length)
    return message.reply({
      embed: warnEmbed(`WARNING`, `Email cannot be blank!`),
    });
  // return message.reply("You can't keep the team name blank!");

  const { value: email, error } = validateEmail(args[0]);

  if (error)
    return message.channel.send({
      embed: warnEmbed(`WARNING`, `Invalid Email Address`),
    });

  const [participant] = await Participant.find({
    email,
  }).select(["email", "registeredOnDiscord", "teamName"]);
  //! check stage ?
  console.log(participant);
  if (!participant)
    return message.channel.send({
      embed: errorEmbed(
        `NOT REGISTERED`,
        `${message.author} You are not registered on devfolio! Make sure to do RSPV or if done, we might update it in some time`
      ),
    }); //!

  if (participant.registeredOnDiscord)
    return message.channel.send({
      embed: warnEmbed(
        `WARNING`,
        ` ${message.author} Email already registered on discord`
      ),
    });

  let team = await Team.findOne({ name: participant.teamName });
  if (!team) {
    let teamNumber = await Team.find().count();
    // if (teamNumber === 0) teamNumber++;
    team = new Team({
      name: participant.teamName,
      number: teamNumber + 1,
    });
  }

  //role name
  const teamName =
    participantTeamNamePrefix + `${team.number}-` + participant.teamName;
  // if role already exist
  if (
    message.member.roles.cache.some((r) =>
      r.name.startsWith(participantTeamNamePrefix)
    )
  )
    return message.channel.send({
      embed: warnEmbed(`WARNING`, `Participant already registered on discord `),
    }); //! change

  participant.discordId = message.author.id;
  participant.discordTag = message.author.tag;
  participant.registeredOnDiscord = true;

  let teamTextChannel;

  if (message.guild.roles.cache.find((r) => r.name === teamName)) {
    const role = message.guild.roles.cache.find((r) => r.name === teamName);
    return message.member.roles
      .add(role)
      .then((ff) => {
        return message.member.guild.channels.cache
          .filter((ch) => ch.name === teamName.toLowerCase())
          .each((ch) => {
            ch.send(
              `Congratulations ${message.author} !! \nYour Discord Registration for this ${email} has been completed`
            ).then((gg) => {
              gg.react("☺️");
            });
          });

        console.log("rols assigned");
      })
      .catch((err) => {
        console.log(err);
      });
  }

  let ID;
  try {
    message.guild.roles
      .create({
        data: {
          name: teamName,
          color: "#14c7cc",
          permissions: ["SEND_MESSAGES", "VIEW_CHANNEL"],
        },
      })
      .then((role) => {
        // console.log(role);
        message.member.roles
          .add(role)
          .then((ff) => {
            console.log("rols assigned");
          })
          .catch((err) => {
            console.log(err);
          });

        message.guild.channels
          .create(teamName, {
            name: teamName,
            type: "category",
            permissionOverwrites: [
              {
                id: message.guild.id,
                deny: ["VIEW_CHANNEL"],
              },
              {
                id: role.id,
                allow: ["VIEW_CHANNEL"],
              },
              {
                id: teamsEvaluateRoleid,
                allow: ["VIEW_CHANNEL"],
              },
            ],
          })
          .then((channel) => {
            ID = channel.id;
          });

        // creating text channel

        message.guild.channels
          .create(teamName, {
            name: teamName,
            type: "text",
            permissionOverwrites: [
              {
                id: message.guild.id,
                deny: ["VIEW_CHANNEL"],
              },
              {
                id: role.id,
                allow: ["VIEW_CHANNEL"],
              },
              {
                id: teamsEvaluateRoleid,
                allow: ["VIEW_CHANNEL"],
              },
            ],
          })
          .then((channel) => {
            console.log("a");
            console.log("ID", ID);

            channel.setParent(ID);

            teamTextChannel = channel.id;

            channel
              .send(
                `Congratulations ${message.author} !! \nYour Discord Registration for this ${email} has been completed`
              )
              .then((gg) => {
                gg.react("☺️");
              });
          });

        // creating voice channel
        message.guild.channels
          .create(teamName, {
            name: teamName,
            type: "voice",
            permissionOverwrites: [
              {
                id: message.guild.id,
                deny: ["VIEW_CHANNEL"],
              },
              {
                id: role.id,
                allow: ["VIEW_CHANNEL"],
              },
              {
                id: teamsEvaluateRoleid,
                allow: ["VIEW_CHANNEL"],
              },
            ],
          })
          .then((channel) => {
            channel.setParent(ID);
          });
        message.channel.bulkDelete(1, true).catch((err) => {
          console.log("Err", err.message);
          // message.reply({
          //   embed: errorEmbed(
          //     `ERROR`,
          //     `There Was An Error Deleing zthe Meassages Reason : ${err.message}`
          //   ),
          // });
        });
      });
    // team.textChannel = channel.id;
    console.log("teamTextChannel", teamTextChannel);
    team.textChannel = teamTextChannel;
    await team.save();
    // await team.save();
    participant.team = team._id;
    participant.teamNumber = team.number;
    await participant.save();
  } catch (error) {
    console.error(error);
    message.reply({
      embed: errorEmbed(
        `ERROR `,
        `Error: Invalid command or Team can't be created!`
      ),
    });
  }
}

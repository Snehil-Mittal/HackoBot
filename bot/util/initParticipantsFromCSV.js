const csv = require("csvtojson");
const Participant = require("../../models/participant");

module.exports = async function (csvPath) {
  csv()
    .fromFile(csvPath)
    .then((data) => {
      data.forEach(async (participantJSON) => {
        try {
          const participant = Object.keys(participantJSON).reduce(
            (obj, key) => {
              let temp = key.split(" ");
              temp[0] = temp[0].toLocaleLowerCase();
              userProp = temp.join("").replace("-", "_");
              obj[userProp] = participantJSON[key];
              return obj;
            },
            {}
          );
          const newParticipant = new Participant({
            ...participant,
          });

          await newParticipant.save();
        } catch (err) {
          if (err.index === 0 && err.code === 11000) return;
          console.log(err);
        }
      });
    });
};

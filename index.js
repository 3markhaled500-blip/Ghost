const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ==================================================
// CONFIG
// ==================================================

const TOKEN = process.env.DISCORD_TOKEN;

// ==================================================
// WELCOME
// ==================================================

const WELCOME_CHANNEL_ID = "1538611932624453783";

const AUTO_ROLE_IDS = [
  "1535767262580047923",
  "1535763946596728902"
];

// ==================================================
// TICKETS
// ==================================================

const TICKET_PANEL_CHANNEL_ID = "1536034090082369628";

// ==================================================
// ADMIN APPLICATION
// ==================================================

const APPLICATION_PANEL_CHANNEL_ID =
  "1545294601685049414";

const APPLICATION_REVIEW_CHANNEL_ID =
  "1547042513385164820";

const ACCEPTED_ROLE_ID =
  "1535798962462658651";

// ==================================================
// SUPPORT VOICE
// ==================================================

const SUPPORT_VOICE_CHANNEL_ID =
  "1542938449445658816";

const SUPPORT_LOG_CHANNEL_ID =
  "1536033523834687569";

const SUPPORT_STAFF_ROLE_ID =
  "1535755112969015367";

// 1 minute = 1 support point
const SUPPORT_POINTS_PER_MINUTE = 1;

// ==================================================
// DATA FILES
// ==================================================

const APPLICATIONS_FILE =
  path.join(__dirname, "applications.json");

const SUPPORT_DATA_FILE =
  path.join(__dirname, "support-data.json");

// ==================================================
// TICKET TYPES
// ==================================================

const TICKET_TYPES = {

  support: {
    name: "دعم فني",
    emoji: "🎧",
    roles: [
      "1535756172551004322",
      "1535755003669647410"
    ]
  },

  moderation: {
    name: "رقابة",
    emoji: "🛡️",
    roles: [
      "1535759964235104326",
      "1535759833427480576"
    ]
  },

  player_complaint: {
    name: "شكوى ضد لاعب",
    emoji: "👤",
    roles: [
      "1535754877882474557",
      "1535754908261941350",
      "1540288189128904724"
    ]
  },

  appeal: {
    name: "استئناف",
    emoji: "📋",
    roles: [
      "1535754877882474557",
      "1540288189128904724"
    ]
  },

  admin_complaint: {
    name: "شكوى ضد إداري",
    emoji: "⚠️",
    roles: [
      "1535754877882474557",
      "1536164964379660349"
    ]
  },

  store: {
    name: "المتجر",
    emoji: "🛒",
    roles: [
      "1535769709029490778",
      "1535769580331335680"
    ]
  },

  bug: {
    name: "إبلاغ عن الأخطاء",
    emoji: "🐛",
    roles: [
      "1535763358941192252",
      "1535762878794305676"
    ]
  },

  compensation: {
    name: "تعويضات",
    emoji: "💰",
    roles: [
      "1535757299505696938",
      "1535757222515310593"
    ]
  },

  wis_mod: {
    name: "طلب ويس مود",
    emoji: "🎙️",
    roles: [
      "1540288189128904724",
      "1535759964235104326"
    ]
  },

  founders: {
    name: "تواصل مع المؤسسين",
    emoji: "👑",
    roles: [
      "1535754877882474557"
    ]
  },

  police: {
    name: "انضمام إلى شرطة لوس سانتوس",
    emoji: "👮",
    roles: [
      "1540263682829975622",
      "1542089930191147028"
    ]
  },

  hospital: {
    name: "انضمام إلى مستشفى لوس سانتوس",
    emoji: "🏥",
    roles: [
      "1542234998252241016",
      "1543249300484657336"
    ]
  },

  high_admin: {
    name: "إدارة عليا",
    emoji: "👑",
    roles: [
      "1540288189128904724",
      "1535754908261941350"
    ]
  }
};

// ==================================================
// APPLICATION QUESTIONS
// ==================================================

const APPLICATION_QUESTIONS = [

  "ما اسمك؟",

  "كم عمرك؟",

  "ما اسمك داخل السيرفر؟",

  "ما هو ID الخاص بك داخل Discord؟",

  "هل لديك خبرة سابقة في الإدارة؟ اشرح لنا خبرتك.",

  "ما هي الرتب الإدارية التي حصلت عليها سابقًا؟",

  "لماذا تريد الانضمام إلى طاقم الإدارة؟",

  "ما الذي يمكنك تقديمه للسيرفر كإداري؟",

  "كيف تتصرف مع شخص يخالف القوانين أمامك؟",

  "إذا قام إداري أعلى منك بمخالفة القوانين، ماذا ستفعل؟",

  "إذا حدث خلاف بين لاعبين، كيف ستتعامل مع الموقف؟",

  "هل تستطيع العمل تحت الضغط؟",

  "كم من الوقت تستطيع التواجد في السيرفر يوميًا؟",

  "هل لديك ميكروفون ويمكنك دخول الرومات الصوتية عند الحاجة؟",

  "هل قرأت قوانين السيرفر وتوافق على الالتزام بها؟",

  "هل لديك أي شيء آخر تريد إضافته أو إخبار الإدارة به؟"
];

// ==================================================
// CLIENT
// ==================================================

const client = new Client({

  intents: [

    GatewayIntentBits.Guilds,

    GatewayIntentBits.GuildMembers,

    GatewayIntentBits.GuildVoiceStates,

    GatewayIntentBits.DirectMessages,

    GatewayIntentBits.MessageContent
  ],

  partials: [

    Partials.GuildMember,

    Partials.User,

    Partials.Channel
  ]
});

// ==================================================
// DATA HELPERS
// ==================================================

function loadJSON(file, defaultValue) {

  try {

    if (!fs.existsSync(file)) {

      fs.writeFileSync(
        file,
        JSON.stringify(defaultValue, null, 2)
      );

      return defaultValue;
    }

    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );

  } catch (error) {

    console.error(
      `❌ Error loading ${file}:`,
      error
    );

    return defaultValue;
  }
}


function saveJSON(file, data) {

  try {

    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2)
    );

  } catch (error) {

    console.error(
      `❌ Error saving ${file}:`,
      error
    );
  }
}


const applications =
  loadJSON(APPLICATIONS_FILE, {});

const supportData =
  loadJSON(SUPPORT_DATA_FILE, {

    users: {},

    activeSessions: {}
  });


// ==================================================
// UTILITY
// ==================================================

function formatDuration(ms) {

  const totalSeconds =
    Math.floor(ms / 1000);

  const days =
    Math.floor(totalSeconds / 86400);

  const hours =
    Math.floor((totalSeconds % 86400) / 3600);

  const minutes =
    Math.floor((totalSeconds % 3600) / 60);

  const seconds =
    totalSeconds % 60;

  const parts = [];

  if (days > 0)
    parts.push(`${days} يوم`);

  if (hours > 0)
    parts.push(`${hours} ساعة`);

  if (minutes > 0)
    parts.push(`${minutes} دقيقة`);

  if (seconds > 0 || parts.length === 0)
    parts.push(`${seconds} ثانية`);

  return parts.join(" و ");
}


function getSupportUser(userId) {

  if (!supportData.users[userId]) {

    supportData.users[userId] = {

      totalMilliseconds: 0,

      points: 0,

      sessions: 0
    };
  }

  return supportData.users[userId];
}


// ==================================================
// READY
// ==================================================

client.once("ready", async () => {

  console.log(
    `✅ Logged in as ${client.user.tag}`
  );

  client.user.setPresence({

    activities: [
      {
        name: "Ghost RP",
        type: 3
      }
    ],

    status: "online"
  });

  await setupTicketPanel();

  await setupApplicationPanel();

  await restoreSupportSessions();

  console.log("✅ All systems are ready.");
});


// ==================================================
// MEMBER JOIN
// ==================================================

client.on(
  "guildMemberAdd",
  async (member) => {

    try {

      // إعطاء الرولات تلقائيًا

      for (const roleId of AUTO_ROLE_IDS) {

        const role =
          member.guild.roles.cache.get(roleId);

        if (role) {

          await member.roles
            .add(role)
            .catch(() => {});
        }
      }


      // روم الترحيب

      const welcomeChannel =
        member.guild.channels.cache.get(
          WELCOME_CHANNEL_ID
        );

      if (!welcomeChannel)
        return;


      const embed =
        new EmbedBuilder()

          .setColor("#1683ff")

          .setTitle(
            "👋 مرحباً بك في Ghost RP"
          )

          .setDescription(

            `أهلاً وسهلاً بك ${member} ❤️\n\n` +

            `نورت سيرفر **Ghost FiveM Roleplay**\n` +

            `نتمنى لك تجربة ممتعة ومميزة معنا.\n\n` +

            `📜 يرجى قراءة القوانين والالتزام بأنظمة السيرفر.\n` +

            `🎫 إذا احتجت أي مساعدة يمكنك فتح تذكرة من قسم الدعم.`
          )

          .setThumbnail(
            member.user.displayAvatarURL({
              dynamic: true,
              size: 256
            })
          )

          .setFooter({
            text: "Ghost FiveM Roleplay"
          })

          .setTimestamp();


      const bannerPath =
        path.join(
          __dirname,
          "banner.png"
        );


      if (fs.existsSync(bannerPath)) {

        const banner =
          new AttachmentBuilder(
            bannerPath,
            {
              name: "ghost-banner.png"
            }
          );

        embed.setImage(
          "attachment://ghost-banner.png"
        );


        await welcomeChannel.send({

          content:
            `👋 نورتنا ${member}!`,

          embeds: [embed],

          files: [banner]
        });

      } else {

        await welcomeChannel.send({

          content:
            `👋 نورتنا ${member}!`,

          embeds: [embed]
        });

        console.log(
          "⚠️ banner.png غير موجودة."
        );
      }

    } catch (error) {

      console.error(
        "❌ Welcome Error:",
        error
      );
    }
  }
);


// ==================================================
// TICKET PANEL
// ==================================================

async function setupTicketPanel() {

  try {

    const channel =
      await client.channels.fetch(
        TICKET_PANEL_CHANNEL_ID
      );

    if (!channel) {

      console.log(
        "❌ لم يتم العثور على روم التذاكر."
      );

      return;
    }


    const options =
      Object.entries(TICKET_TYPES)
        .map(
          ([value, ticket]) => {

            return new StringSelectMenuOptionBuilder()

              .setLabel(ticket.name)

              .setDescription(
                `فتح تذكرة ${ticket.name}`
              )

              .setValue(value)

              .setEmoji(ticket.emoji);
          }
        );


    const menu =
      new StringSelectMenuBuilder()

        .setCustomId(
          "ticket_select"
        )

        .setPlaceholder(
          "🎫 اختر نوع التذكرة"
        )

        .addOptions(options);


    const row =
      new ActionRowBuilder()
        .addComponents(menu);


    const embed =
      new EmbedBuilder()

        .setColor("#1683ff")

        .setTitle(
          "🎫 نظام التذاكر - Ghost RP"
        )

        .setDescription(

          "**مرحباً بك في نظام التذاكر**\n\n" +

          "اختر القسم المناسب لمشكلتك من القائمة بالأسفل.\n\n" +

          "🔒 كل تذكرة تكون **خاصة** بصاحبها والمسؤولين المختصين بالقسم فقط.\n\n" +

          "📢 عند فتح التذكرة سيتم عمل Mention للمسؤولين المختصين تلقائياً.\n\n" +

          "⚠️ يرجى عدم فتح تذكرة بدون سبب."
        )

        .setFooter({
          text:
            "Ghost FiveM Roleplay • Ticket System"
        })

        .setTimestamp();


    const messages =
      await channel.messages.fetch({
        limit: 50
      });


    const oldPanel =
      messages.find(

        msg =>

          msg.author.id === client.user.id &&

          msg.components.some(

            row =>

              row.components.some(

                component =>

                  component.customId ===
                  "ticket_select"
              )
          )
      );


    if (oldPanel) {

      await oldPanel.edit({

        embeds: [embed],

        components: [row]
      });

      console.log(
        "✅ تم تحديث لوحة التذاكر."
      );

    } else {

      await channel.send({

        embeds: [embed],

        components: [row]
      });

      console.log(
        "✅ تم إرسال لوحة التذاكر."
      );
    }

  } catch (error) {

    console.error(
      "❌ Ticket Panel Error:",
      error
    );
  }
}


// ==================================================
// APPLICATION PANEL
// ==================================================

async function setupApplicationPanel() {

  try {

    const channel =
      await client.channels.fetch(
        APPLICATION_PANEL_CHANNEL_ID
      );

    if (!channel) {

      console.log(
        "❌ Application Panel Channel not found."
      );

      return;
    }


    const button =
      new ButtonBuilder()

        .setCustomId(
          "start_admin_application"
        )

        .setLabel(
          "تقديم على الإدارة"
        )

        .setEmoji("📝")

        .setStyle(
          ButtonStyle.Primary
        );


    const row =
      new ActionRowBuilder()
        .addComponents(button);


    const embed =
      new EmbedBuilder()

        .setColor("#1683ff")

        .setTitle(
          "🛡️ التقديم على طاقم الإدارة"
        )

        .setDescription(

          "هل ترى أنك مناسب للانضمام إلى طاقم الإدارة؟\n\n" +

          "اضغط على زر **تقديم على الإدارة** بالأسفل لبدء التقديم.\n\n" +

          "📩 سيتم إرسال أسئلة التقديم إليك في الخاص.\n\n" +

          "⚠️ يرجى الإجابة على جميع الأسئلة بصدق ووضوح.\n\n" +

          "⏱️ لديك وقت محدد للإجابة على كل سؤال.\n\n" +

          "📋 بعد الانتهاء سيتم إرسال طلبك إلى الإدارة للمراجعة."
        )

        .setFooter({

          text:
            "Ghost FiveM Roleplay • Administration Applications"
        })

        .setTimestamp();


    const messages =
      await channel.messages.fetch({
        limit: 50
      });


    const oldPanel =
      messages.find(

        msg =>

          msg.author.id === client.user.id &&

          msg.components.some(

            row =>

              row.components.some(

                component =>

                  component.customId ===
                  "start_admin_application"
              )
          )
      );


    if (oldPanel) {

      await oldPanel.edit({

        embeds: [embed],

        components: [row]
      });

      console.log(
        "✅ تم تحديث لوحة التقديم."
      );

    } else {

      await channel.send({

        embeds: [embed],

        components: [row]
      });

      console.log(
        "✅ تم إرسال لوحة التقديم."
      );
    }

  } catch (error) {

    console.error(
      "❌ Application Panel Error:",
      error
    );
  }
}


// ==================================================
// START APPLICATION
// ==================================================

async function startApplication(interaction) {

  const userId =
    interaction.user.id;


  // منع التقديم المتكرر

  if (
    applications[userId] &&
    applications[userId].status === "pending"
  ) {

    return interaction.reply({

      content:
        "❌ لديك طلب تقديم قيد المراجعة بالفعل.",

      ephemeral: true
    });
  }


  await interaction.reply({

    content:
      "📩 تم إرسال التقديم إلى الخاص، افتح الـDM مع البوت.",

    ephemeral: true
  });


  let dm;

  try {

    dm =
      await interaction.user.createDM();

    await dm.send(

      "🛡️ **بدأنا تقديم الإدارة**\n\n" +

      "سأرسل لك الأسئلة واحدًا تلو الآخر.\n" +

      "أرسل إجابتك فقط لكل سؤال.\n\n" +

      "⏱️ لديك **10 دقائق** للإجابة على كل سؤال.\n\n" +

      "اكتب `إلغاء` في أي وقت إذا أردت إلغاء التقديم."
    );

  } catch (error) {

    console.error(
      "❌ Cannot DM applicant:",
      error
    );

    return;
  }


  const answers = {};


  for (
    let i = 0;
    i < APPLICATION_QUESTIONS.length;
    i++
  ) {

    const question =
      APPLICATION_QUESTIONS[i];


    await dm.send(

      `**السؤال ${i + 1} من ${APPLICATION_QUESTIONS.length}:**\n\n` +

      question
    );


    try {

      const collected =
        await dm.awaitMessages({

          filter: message =>

            message.author.id ===
            interaction.user.id,

          max: 1,

          time: 10 * 60 * 1000,

          errors: ["time"]
        });


      const answer =
        collected.first().content.trim();


      if (
        answer.toLowerCase() ===
        "إلغاء"
      ) {

        await dm.send(
          "❌ تم إلغاء طلب التقديم."
        );

        return;
      }


      answers[i + 1] =
        answer;

    } catch (error) {

      await dm.send(

        "⏰ انتهى الوقت المحدد للإجابة.\n" +

        "❌ تم إلغاء طلب التقديم."
      );

      return;
    }
  }


  const applicationId =
    `${Date.now()}-${userId}`;


  applications[userId] = {

    id: applicationId,

    userId,

    username:
      interaction.user.tag,

    status:
      "pending",

    answers,

    createdAt:
      new Date().toISOString()
  };


  saveJSON(
    APPLICATIONS_FILE,
    applications
  );


  await sendApplicationForReview(
    interaction.guild,
    interaction.user,
    applications[userId]
  );


  await dm.send(

    "✅ **تم إرسال طلبك بنجاح!**\n\n" +

    "تم إرسال الطلب إلى الإدارة للمراجعة.\n" +

    "يرجى انتظار النتيجة."
  );
}


// ==================================================
// SEND APPLICATION TO REVIEW
// ==================================================

async function sendApplicationForReview(
  guild,
  user,
  application
) {

  try {

    const channel =
      await guild.channels.fetch(
        APPLICATION_REVIEW_CHANNEL_ID
      );

    if (!channel) {

      console.log(
        "❌ Review channel not found."
      );

      return;
    }


    const description =
      APPLICATION_QUESTIONS
        .map(
          (question, index) => {

            const answer =
              application.answers[index + 1] ||
              "لم يتم الرد";

            return (
              `**${index + 1}. ${question}**\n` +
              `${answer}`
            );
          }
        )
        .join("\n\n");


    const embed =
      new EmbedBuilder()

        .setColor("#f1c40f")

        .setTitle(
          "📝 طلب تقديم إدارة جديد"
        )

        .setDescription(
          description
        )

        .addFields({

          name:
            "👤 المتقدم",

          value:
            `${user}\n\`${user.tag}\`\nID: \`${user.id}\``
        })

        .setFooter({

          text:
            `Application ID: ${application.id}`
        })

        .setTimestamp();


    const acceptButton =
      new ButtonBuilder()

        .setCustomId(
          `application_accept_${application.id}`
        )

        .setLabel(
          "قبول"
        )

        .setEmoji("✅")

        .setStyle(
          ButtonStyle.Success
        );


    const rejectButton =
      new ButtonBuilder()

        .setCustomId(
          `application_reject_${application.id}`
        )

        .setLabel(
          "رفض"
        )

        .setEmoji("❌")

        .setStyle(
          ButtonStyle.Danger
        );


    const row =
      new ActionRowBuilder()
        .addComponents(
          acceptButton,
          rejectButton
        );


    const message =
      await channel.send({

        content:
          `<@&${SUPPORT_STAFF_ROLE_ID}>`,

        embeds: [embed],

        components: [row]
      });


    applications[application.userId]
      .reviewMessageId =
      message.id;


    saveJSON(
      APPLICATIONS_FILE,
      applications
    );


  } catch (error) {

    console.error(
      "❌ Send Application Error:",
      error
    );
  }
}


// ==================================================
// CHECK APPLICATION REVIEW PERMISSION
// ==================================================

function canReviewApplication(interaction) {

  if (!interaction.member)
    return false;


  if (
    interaction.member.permissions
      .has(
        PermissionsBitField.Flags.Administrator
      )
  ) {

    return true;
  }


  return interaction.member.roles.cache.has(
    SUPPORT_STAFF_ROLE_ID
  );
}


// ==================================================
// ACCEPT / REJECT APPLICATION
// ==================================================

async function handleApplicationDecision(
  interaction,
  accepted
) {

  if (!canReviewApplication(interaction)) {

    return interaction.reply({

      content:
        "❌ ليس لديك صلاحية لمراجعة طلبات الإدارة.",

      ephemeral: true
    });
  }


  const parts =
    interaction.customId.split("_");


  const applicationId =
    parts.slice(2).join("_");


  const application =
    Object.values(applications)
      .find(
        app =>
          app.id === applicationId
      );


  if (!application) {

    return interaction.reply({

      content:
        "❌ لم يتم العثور على طلب التقديم.",

      ephemeral: true
    });
  }


  if (
    application.status !== "pending"
  ) {

    return interaction.reply({

      content:
        "⚠️ تم اتخاذ قرار في هذا الطلب مسبقًا.",

      ephemeral: true
    });
  }


  const guild =
    interaction.guild;


  const member =
    await guild.members
      .fetch(application.userId)
      .catch(() => null);


  application.status =
    accepted
      ? "accepted"
      : "rejected";


  application.reviewedBy =
    interaction.user.id;


  application.reviewedAt =
    new Date().toISOString();


  saveJSON(
    APPLICATIONS_FILE,
    applications
  );


  if (accepted && member) {

    const role =
      guild.roles.cache.get(
        ACCEPTED_ROLE_ID
      );


    if (role) {

      await member.roles
        .add(role)
        .catch(error => {

          console.error(
            "❌ Accepted Role Error:",
            error
          );
        });
    }
  }


  const resultColor =
    accepted
      ? "#2ecc71"
      : "#e74c3c";


  const resultText =
    accepted
      ? "تم قبول المتقدم مبدئيًا"
      : "تم رفض طلب التقديم";


  const updatedEmbed =
    EmbedBuilder.from(
      interaction.message.embeds[0]
    )

      .setColor(resultColor)

      .addFields({

        name:
          "📌 النتيجة",

        value:
          `${accepted ? "✅" : "❌"} ${resultText}\n` +
          `بواسطة: ${interaction.user}`
      });


  const disabledRow =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()

          .setCustomId(
            `application_accept_disabled_${applicationId}`
          )

          .setLabel("قبول")

          .setEmoji("✅")

          .setStyle(
            ButtonStyle.Success
          )

          .setDisabled(true),


        new ButtonBuilder()

          .setCustomId(
            `application_reject_disabled_${applicationId}`
          )

          .setLabel("رفض")

          .setEmoji("❌")

          .setStyle(
            ButtonStyle.Danger
          )

          .setDisabled(true)
      );


  await interaction.update({

    embeds: [updatedEmbed],

    components: [disabledRow]
  });


  // إرسال النتيجة للمتقدم

  try {

    const user =
      await client.users.fetch(
        application.userId
      );


    if (accepted) {

      await user.send(

        "🎉 **تم قبول طلبك مبدئيًا!**\n\n" +

        "تمت الموافقة على طلب تقديمك للإدارة.\n" +

        "يرجى انتظار تعليمات الإدارة القادمة."
      );

    } else {

      await user.send(

        "❌ **تم رفض طلب تقديمك.**\n\n" +

        "يمكنك المحاولة مرة أخرى في المستقبل."
      );
    }

  } catch (error) {

    console.log(
      "⚠️ Cannot DM application result."
    );
  }
}


// ==================================================
// SUPPORT VOICE - JOIN
// ==================================================

async function startSupportSession(
  member
) {

  const userId =
    member.id;


  if (
    supportData.activeSessions[userId]
  ) {

    return;
  }


  supportData.activeSessions[userId] = {

    guildId:
      member.guild.id,

    channelId:
      SUPPORT_VOICE_CHANNEL_ID,

    startedAt:
      Date.now()
  };


  const user =
    getSupportUser(userId);


  user.sessions++;


  saveJSON(
    SUPPORT_DATA_FILE,
    supportData
  );


  await sendSupportLog(

    member.guild,

    new EmbedBuilder()

      .setColor("#2ecc71")

      .setTitle(
        "🎧 دخول الدعم الفني"
      )

      .setDescription(
        `${member} دخل روم الدعم الفني.`
      )

      .addFields(

        {
          name: "👤 العضو",
          value:
            `${member}\n\`${member.user.tag}\``
        },

        {
          name: "🆔 ID",
          value:
            `\`${member.id}\``
        },

        {
          name: "📅 وقت الدخول",
          value:
            `<t:${Math.floor(Date.now() / 1000)}:F>`
        }

      )

      .setTimestamp()
  );
}


// ==================================================
// SUPPORT VOICE - LEAVE
// ==================================================

async function endSupportSession(
  member
) {

  const userId =
    member.id;


  const session =
    supportData.activeSessions[userId];


  if (!session)
    return;


  const now =
    Date.now();


  const duration =
    now - session.startedAt;


  const user =
    getSupportUser(userId);


  user.totalMilliseconds +=
    duration;


  const points =
    Math.floor(
      duration / 60000
    ) * SUPPORT_POINTS_PER_MINUTE;


  user.points += points;


  delete supportData.activeSessions[userId];


  saveJSON(
    SUPPORT_DATA_FILE,
    supportData
  );


  await sendSupportLog(

    member.guild,

    new EmbedBuilder()

      .setColor("#e74c3c")

      .setTitle(
        "🎧 خروج من الدعم الفني"
      )

      .setDescription(
        `${member} خرج من روم الدعم الفني.`
      )

      .addFields(

        {
          name: "👤 العضو",
          value:
            `${member}\n\`${member.user.tag}\``
        },

        {
          name: "⏱️ مدة الجلسة",
          value:
            formatDuration(duration)
        },

        {
          name: "⭐ نقاط الجلسة",
          value:
            `${points} نقطة`
        },

        {
          name: "📊 إجمالي الوقت",
          value:
            formatDuration(
              user.totalMilliseconds
            )
        },

        {
          name: "🏆 إجمالي النقاط",
          value:
            `${user.points} نقطة`
        }

      )

      .setTimestamp()
  );
}


// ==================================================
// SUPPORT LOG
// ==================================================

async function sendSupportLog(
  guild,
  embed
) {

  try {

    const channel =
      guild.channels.cache.get(
        SUPPORT_LOG_CHANNEL_ID
      );


    if (!channel)
      return;


    await channel.send({
      embeds: [embed]
    });

  } catch (error) {

    console.error(
      "❌ Support Log Error:",
      error
    );
  }
}


// ==================================================
// RESTORE SUPPORT SESSIONS
// ==================================================

async function restoreSupportSessions() {

  try {

    for (
      const guild of client.guilds.cache.values()
    ) {

      const voiceChannel =
        guild.channels.cache.get(
          SUPPORT_VOICE_CHANNEL_ID
        );


      if (
        !voiceChannel ||
        voiceChannel.type !==
        ChannelType.GuildVoice
      ) {

        continue;
      }


      for (
        const member of voiceChannel.members.values()
      ) {

        if (
          !supportData.activeSessions[
            member.id
          ]
        ) {

          supportData.activeSessions[
            member.id
          ] = {

            guildId:
              guild.id,

            channelId:
              SUPPORT_VOICE_CHANNEL_ID,

            startedAt:
              Date.now()
          };


          getSupportUser(
            member.id
          ).sessions++;
        }
      }
    }


    saveJSON(
      SUPPORT_DATA_FILE,
      supportData
    );


    console.log(
      "✅ Support sessions restored."
    );

  } catch (error) {

    console.error(
      "❌ Restore Support Error:",
      error
    );
  }
}


// ==================================================
// VOICE STATE UPDATE
// ==================================================

client.on(
  "voiceStateUpdate",
  async (oldState, newState) => {

    try {

      const member =
        newState.member ||
        oldState.member;


      if (!member)
        return;


      const wasInSupport =
        oldState.channelId ===
        SUPPORT_VOICE_CHANNEL_ID;


      const isInSupport =
        newState.channelId ===
        SUPPORT_VOICE_CHANNEL_ID;


      // دخل الدعم

      if (
        !wasInSupport &&
        isInSupport
      ) {

        await startSupportSession(
          member
        );

        return;
      }


      // خرج من الدعم

      if (
        wasInSupport &&
        !isInSupport
      ) {

        await endSupportSession(
          member
        );

        return;
      }


      // انتقال داخل نفس روم الدعم

      if (
        wasInSupport &&
        isInSupport
      ) {

        return;
      }

    } catch (error) {

      console.error(
        "❌ Voice System Error:",
        error
      );
    }
  }
);


// ==================================================
// INTERACTIONS
// ==================================================

client.on(
  "interactionCreate",
  async (interaction) => {

    try {

      // ==================================================
      // ADMIN APPLICATION BUTTON
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
        "start_admin_application"
      ) {

        await startApplication(
          interaction
        );

        return;
      }


      // ==================================================
      // APPLICATION ACCEPT
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "application_accept_"
        ) &&
        !interaction.customId.startsWith(
          "application_accept_disabled_"
        )
      ) {

        await handleApplicationDecision(
          interaction,
          true
        );

        return;
      }


      // ==================================================
      // APPLICATION REJECT
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "application_reject_"
        ) &&
        !interaction.customId.startsWith(
          "application_reject_disabled_"
        )
      ) {

        await handleApplicationDecision(
          interaction,
          false
        );

        return;
      }


      // ==================================================
      // TICKET SELECT MENU
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
        "ticket_select"
      ) {

        const type =
          interaction.values[0];


        const ticket =
          TICKET_TYPES[type];


        if (!ticket)
          return;


        await interaction.deferReply({
          ephemeral: true
        });


        const guild =
          interaction.guild;


        const member =
          interaction.member;


        // البحث عن تذكرة مفتوحة

        const existingTicket =
          guild.channels.cache.find(

            channel =>

              channel.type ===
              ChannelType.GuildText &&

              channel.topic ===
              `ticket-owner:${member.id}`
          );


        if (existingTicket) {

          return interaction.editReply({

            content:
              `❌ لديك تذكرة مفتوحة بالفعل:\n${existingTicket}`
          });
        }


        const safeName =
          ticket.name

            .replace(
              /[^\u0600-\u06FFa-zA-Z0-9 ]/g,
              ""
            )

            .trim()

            .replace(
              /\s+/g,
              "-"
            )

            .toLowerCase();


        const channelName =
          `ticket-${safeName}-${member.user.username}`
            .toLowerCase()
            .slice(0, 90);


        const permissionOverwrites = [

          {
            id:
              guild.roles.everyone.id,

            deny: [
              PermissionsBitField.Flags
                .ViewChannel
            ]
          },


          {
            id:
              member.id,

            allow: [

              PermissionsBitField.Flags
                .ViewChannel,

              PermissionsBitField.Flags
                .SendMessages,

              PermissionsBitField.Flags
                .ReadMessageHistory,

              PermissionsBitField.Flags
                .AttachFiles
            ]
          },


          {
            id:
              client.user.id,

            allow: [

              PermissionsBitField.Flags
                .ViewChannel,

              PermissionsBitField.Flags
                .SendMessages,

              PermissionsBitField.Flags
                .ReadMessageHistory,

              PermissionsBitField.Flags
                .ManageChannels,

              PermissionsBitField.Flags
                .ManageMessages
            ]
          }
        ];


        for (
          const roleId of ticket.roles
        ) {

          permissionOverwrites.push({

            id: roleId,

            allow: [

              PermissionsBitField.Flags
                .ViewChannel,

              PermissionsBitField.Flags
                .SendMessages,

              PermissionsBitField.Flags
                .ReadMessageHistory,

              PermissionsBitField.Flags
                .AttachFiles
            ]
          });
        }


        const ticketChannel =
          await guild.channels.create({

            name:
              channelName,

            type:
              ChannelType.GuildText,

            topic:
              `ticket-owner:${member.id}`,

            permissionOverwrites
          });


        const panelChannel =
          guild.channels.cache.get(
            TICKET_PANEL_CHANNEL_ID
          );


        if (
          panelChannel &&
          panelChannel.parentId
        ) {

          await ticketChannel
            .setParent(
              panelChannel.parentId,
              {
                lockPermissions: false
              }
            )
            .catch(() => {});
        }


        const closeButton =
          new ButtonBuilder()

            .setCustomId(
              "close_ticket"
            )

            .setLabel(
              "إغلاق التذكرة"
            )

            .setEmoji("🔒")

            .setStyle(
              ButtonStyle.Danger
            );


        const row =
          new ActionRowBuilder()
            .addComponents(
              closeButton
            );


        const ticketEmbed =
          new EmbedBuilder()

            .setColor("#1683ff")

            .setTitle(
              `${ticket.emoji} ${ticket.name}`
            )

            .setDescription(

              `مرحباً ${member} 👋\n\n` +

              `تم فتح تذكرتك بنجاح.\n` +

              `سيقوم المسؤولون المختصون بمساعدتك في أقرب وقت.\n\n` +

              `📌 **القسم:** ${ticket.name}\n` +

              `👤 **صاحب التذكرة:** ${member}\n\n` +

              `⚠️ يرجى شرح مشكلتك بالتفصيل وعدم عمل Mention للمسؤولين.`
            )

            .setFooter({
              text:
                "Ghost FiveM Roleplay"
            })

            .setTimestamp();


        const roleMentions =
          ticket.roles
            .map(
              roleId =>
                `<@&${roleId}>`
            )
            .join(" ");


        await ticketChannel.send({

          content:
            `${member}\n${roleMentions}`,

          embeds: [
            ticketEmbed
          ],

          components: [
            row
          ]
        });


        await interaction.editReply({

          content:
            `✅ تم فتح تذكرتك بنجاح!\n\n${ticketChannel}`
        });


        return;
      }


      // ==================================================
      // CLOSE TICKET
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
        "close_ticket"
      ) {

        const channel =
          interaction.channel;


        if (
          !channel ||
          channel.type !==
          ChannelType.GuildText
        ) {

          return;
        }


        await interaction.reply({

          content:
            "🔒 سيتم إغلاق التذكرة خلال 5 ثوانٍ...",

          ephemeral: false
        });


        setTimeout(
          async () => {

            await channel
              .delete()
              .catch(() => {});

          },
          5000
        );


        return;
      }

    } catch (error) {

      console.error(
        "❌ Interaction Error:",
        error
      );


      if (
        interaction.replied ||
        interaction.deferred
      ) {

        await interaction
          .followUp({

            content:
              "❌ حدث خطأ أثناء تنفيذ العملية.",

            ephemeral: true
          })
          .catch(() => {});

      } else {

        await interaction
          .reply({

            content:
              "❌ حدث خطأ أثناء تنفيذ العملية.",

            ephemeral: true
          })
          .catch(() => {});
      }
    }
  }
);


// ==================================================
// ERROR HANDLING
// ==================================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);


process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);


// ==================================================
// TOKEN CHECK
// ==================================================

if (!TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN غير موجود في Railway Variables!"
  );

  process.exit(1);
}


// ==================================================
// LOGIN
// ==================================================

client.login(TOKEN)

  .then(() => {

    console.log(
      "✅ Discord login successful."
    );

  })

  .catch(error => {

    console.error(
      "❌ Discord Login Error:",
      error.message
    );
  });

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} = require("discord.js");

/* =========================================================
   CONFIG - YOUR IDS ONLY
========================================================= */

const CONFIG = {
  SERVER_NAME: process.env.SERVER_NAME || "Legend CFW",
  WELCOME_IMAGE_URL: process.env.WELCOME_IMAGE_URL || "",

  // Welcome
  WELCOME_CHANNEL_ID: "1538611932624453783",
  AUTO_ROLE_ID: "1535765156494319726",

  // Staff Applications
  STAFF_APPLICATION_CHANNEL_ID: "1545294601685049414",
  STAFF_APPLICATION_REVIEW_CHANNEL_ID: "1547042513385164820",
  STAFF_APPLICATION_ACCEPTED_CHANNEL_ID: "1557648907985625098",
  STAFF_APPLICATION_REJECTED_CHANNEL_ID: "1557648827262181396",
  STAFF_ACCEPTED_ROLE_ID: "1535798962462658651",

  // Attendance
  ATTENDANCE_CHANNEL_ID: "1542938449445658816",
  ATTENDANCE_LOG_CHANNEL_ID: "1542938449445658816",

  // Tickets
  TICKET_CATEGORY_ID: "1536034090082369628",
  TICKET_LOG_CHANNEL_ID: "1542967957796290580",

  // Permit
  PERMIT_ACCEPT_CHANNEL_ID: "1557646459757658152",
  PERMIT_REJECT_CHANNEL_ID: "1557646522387005480",
  PERMIT_PENDING_CHANNEL_ID: "1557646570642735134",
  PERMIT_ROLE_ID: "1535764584152043601",

  // Staff Roles
  TICKET_STAFF_ROLE_IDS: [
    "1535755153838313542",
    "1535755234989572226",
  ],

  SUPPORT_STAFF_ROLE_ID: "1535755112969015367",
};

const ALL_STAFF_ROLE_IDS = [
  ...CONFIG.TICKET_STAFF_ROLE_IDS,
  CONFIG.SUPPORT_STAFF_ROLE_ID,
];

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

/* =========================================================
   DATABASE
========================================================= */

const DB_FILE = path.join(__dirname, "database.json");

const DEFAULT_DB = {
  panels: {},

  attendance: {},

  applications: {},

  tickets: {},

  stats: {
    totalTickets: 0,
    totalApplications: 0,
  },
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
      return structuredClone(DEFAULT_DB);
    }

    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    return {
      ...structuredClone(DEFAULT_DB),
      ...data,
      panels: data.panels || {},
      attendance: data.attendance || {},
      applications: data.applications || {},
      tickets: data.tickets || {},
      stats: {
        ...DEFAULT_DB.stats,
        ...(data.stats || {}),
      },
    };
  } catch (error) {
    console.error("DATABASE LOAD ERROR:", error);
    return structuredClone(DEFAULT_DB);
  }
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("DATABASE SAVE ERROR:", error);
  }
}

/* =========================================================
   HELPERS
========================================================= */

function formatDuration(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));

  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (days) parts.push(`${days} يوم`);
  if (hours) parts.push(`${hours} ساعة`);
  if (minutes) parts.push(`${minutes} دقيقة`);
  if (seconds || parts.length === 0) parts.push(`${seconds} ثانية`);

  return parts.join(" و ");
}

function formatDate(timestamp) {
  if (!timestamp) return "غير متوفر";

  return new Date(timestamp).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  });
}

function memberIsAnyStaff(member) {
  if (!member) return false;

  if (member.permissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  return ALL_STAFF_ROLE_IDS.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

function memberIsTicketStaff(member) {
  if (!member) return false;

  if (member.permissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  return (
    CONFIG.TICKET_STAFF_ROLE_IDS.some((roleId) =>
      member.roles.cache.has(roleId)
    ) ||
    member.roles.cache.has(CONFIG.SUPPORT_STAFF_ROLE_ID)
  );
}

function memberIsSupportStaff(member) {
  if (!member) return false;

  if (member.permissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  return member.roles.cache.has(CONFIG.SUPPORT_STAFF_ROLE_ID);
}

function getAttendance(userId) {
  if (!db.attendance[userId]) {
    db.attendance[userId] = {
      active: false,
      startedAt: null,
      currentStartAt: null,

      totalSeconds: 0,
      voiceSeconds: 0,

      voiceJoinedAt: null,

      shifts: 0,
      points: 0,

      ticketsClaimed: 0,
      ticketsClosed: 0,

      lastCheckIn: null,
      lastCheckOut: null,
    };
  }

  return db.attendance[userId];
}

function addPoints(userId, amount) {
  const attendance = getAttendance(userId);
  attendance.points += amount;
  saveDB();
}

async function getChannel(channelId) {
  try {
    return await client.channels.fetch(channelId);
  } catch {
    return null;
  }
}

async function getGuild() {
  const channel =
    (await getChannel(CONFIG.WELCOME_CHANNEL_ID)) ||
    (await getChannel(CONFIG.ATTENDANCE_CHANNEL_ID));

  return channel?.guild || null;
}

function buildDisabledStaffButtons(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`staff_accept_${userId}`)
      .setLabel("قبول")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId(`staff_reject_${userId}`)
      .setLabel("رفض")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId(`staff_pending_${userId}`)
      .setLabel("قيد المراجعة")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );
}

async function upsertPanel(key, channel, payload) {
  if (!channel || !channel.isTextBased()) return null;

  let message = null;

  if (db.panels[key]) {
    try {
      message = await channel.messages.fetch(db.panels[key]);
    } catch {
      message = null;
    }
  }

  if (!message) {
    try {
      const messages = await channel.messages.fetch({ limit: 30 });

      message =
        messages.find(
          (msg) =>
            msg.author.id === client.user.id &&
            msg.embeds?.[0]?.footer?.text === `LEGEND_PANEL:${key}`
        ) || null;
    } catch {
      message = null;
    }
  }

  if (message) {
    await message.edit(payload).catch(() => {});
  } else {
    message = await channel.send(payload).catch(() => null);
  }

  if (message) {
    db.panels[key] = message.id;
    saveDB();
  }

  return message;
}

/* =========================================================
   WELCOME
========================================================= */

client.on("guildMemberAdd", async (member) => {
  try {
    const role = member.guild.roles.cache.get(CONFIG.AUTO_ROLE_ID);

    if (role) {
      await member.roles.add(role).catch((error) => {
        console.error("AUTO ROLE ERROR:", error.message);
      });
    }

    const channel = member.guild.channels.cache.get(
      CONFIG.WELCOME_CHANNEL_ID
    );

    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle(`أهلاً وسهلاً بك في ${CONFIG.SERVER_NAME}`)
      .setDescription(
        `أهلاً بك ${member}\n\n` +
          `نتمنى لك وقتًا ممتعًا في السيرفر.\n` +
          `يرجى قراءة القوانين والالتزام بأنظمة السيرفر.`
      )
      .addFields({
        name: "👤 العضو",
        value: `${member}`,
        inline: true,
      })
      .setColor(0x2b2d31)
      .setTimestamp();

    if (CONFIG.WELCOME_IMAGE_URL) {
      embed.setImage(CONFIG.WELCOME_IMAGE_URL);
    }

    await channel.send({
      content: `مرحباً ${member}`,
      embeds: [embed],
    });
  } catch (error) {
    console.error("WELCOME ERROR:", error);
  }
});

/* =========================================================
   STAFF APPLICATION PANEL
========================================================= */

async function setupStaffApplicationPanel() {
  const channel = await getChannel(
    CONFIG.STAFF_APPLICATION_CHANNEL_ID
  );

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("📋 التقديم على الإدارة")
    .setDescription(
      "للتقديم على الإدارة اضغط على الزر بالأسفل.\n\n" +
        "سيتم إرسال أسئلة التقديم لك في الخاص **DM**.\n" +
        "بعد الانتهاء سيتم إرسال طلبك للإدارة للمراجعة."
    )
    .setColor(0x5865f2)
    .setFooter({
      text: "LEGEND_PANEL:staff_application",
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("staff_apply")
      .setLabel("تقديم على الإدارة")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Primary)
  );

  await upsertPanel("staff_application", channel, {
    embeds: [embed],
    components: [row],
  });
}

/* =========================================================
   STAFF APPLICATION FLOW
========================================================= */

const APPLICATION_QUESTIONS = [
  "ما اسمك؟",
  "كم عمرك؟",
  "ما اسمك في FiveM؟",
  "ما خبرتك السابقة في الإدارة؟",
  "لماذا تريد الانضمام إلى الإدارة؟",
  "كم ساعة تستطيع التواجد يوميًا؟",
  "هل تستطيع الالتزام بقوانين الإدارة؟",
  "احكِ لنا موقفًا إداريًا وكيف ستتعامل معه.",
];

async function startStaffApplication(interaction) {
  const userId = interaction.user.id;

  if (
    db.applications[userId] &&
    db.applications[userId].status === "pending"
  ) {
    return interaction.reply({
      content: "⚠️ لديك طلب إدارة قيد المراجعة بالفعل.",
      ephemeral: true,
    });
  }

  let dm;

  try {
    dm = await interaction.user.createDM();
  } catch {
    return interaction.reply({
      content:
        "❌ لا أستطيع إرسال رسالة خاصة لك. افتح الـDM من إعدادات الخصوصية ثم حاول مرة أخرى.",
      ephemeral: true,
    });
  }

  await interaction.reply({
    content:
      "✅ تم بدء التقديم. راجع الخاص DM وأجب عن الأسئلة واحدًا تلو الآخر.",
    ephemeral: true,
  });

  const answers = {};

  try {
    await dm.send(
      "📋 **تم فتح تقديمك على الإدارة**\n\n" +
        "جاوب على الأسئلة بالترتيب. كل سؤال له وقت محدد.\n" +
        "عند الانتهاء سيتم إرسال طلبك للإدارة للمراجعة."
    );

    for (let i = 0; i < APPLICATION_QUESTIONS.length; i++) {
      const question = APPLICATION_QUESTIONS[i];

      await dm.send(
        `**السؤال ${i + 1}/${APPLICATION_QUESTIONS.length}**\n${question}`
      );

      const collected = await dm
        .awaitMessages({
          filter: (message) =>
            message.author.id === interaction.user.id &&
            !message.author.bot,
          max: 1,
          time: 10 * 60 * 1000,
        })
        .catch(() => null);

      if (!collected || collected.size === 0) {
        await dm.send(
          "❌ انتهى وقت التقديم بسبب عدم وجود رد.\nيمكنك البدء من جديد من Channel التقديم."
        );
        return;
      }

      answers[`question_${i + 1}`] = collected.first().content;
    }

    const reviewChannel = await getChannel(
      CONFIG.STAFF_APPLICATION_REVIEW_CHANNEL_ID
    );

    if (!reviewChannel || !reviewChannel.isTextBased()) {
      await dm.send(
        "❌ حدث خطأ في نظام المراجعة. تواصل مع الإدارة."
      );
      return;
    }

    const applicationEmbed = new EmbedBuilder()
      .setTitle("📋 طلب تقديم إدارة جديد")
      .setDescription(`المتقدم: <@${userId}>`)
      .addFields(
        {
          name: "1️⃣ الاسم",
          value: answers.question_1 || "—",
        },
        {
          name: "2️⃣ العمر",
          value: answers.question_2 || "—",
        },
        {
          name: "3️⃣ اسم FiveM",
          value: answers.question_3 || "—",
        },
        {
          name: "4️⃣ الخبرة",
          value: answers.question_4 || "—",
        },
        {
          name: "5️⃣ سبب التقديم",
          value: answers.question_5 || "—",
        },
        {
          name: "6️⃣ التواجد اليومي",
          value: answers.question_6 || "—",
        },
        {
          name: "7️⃣ الالتزام",
          value: answers.question_7 || "—",
        },
        {
          name: "8️⃣ الموقف الإداري",
          value: answers.question_8 || "—",
        }
      )
      .setColor(0xf1c40f)
      .setTimestamp()
      .setFooter({
        text: `USER_ID: ${userId}`,
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accept_${userId}`)
        .setLabel("قبول")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`staff_reject_${userId}`)
        .setLabel("رفض")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`staff_pending_${userId}`)
        .setLabel("قيد المراجعة")
        .setEmoji("⏳")
        .setStyle(ButtonStyle.Secondary)
    );

    const reviewMessage = await reviewChannel.send({
      embeds: [applicationEmbed],
      components: [row],
    });

    db.applications[userId] = {
      status: "pending",
      submittedAt: Date.now(),
      applicationMessageId: reviewMessage.id,
      answers,
      reviewerId: null,
      rejectionReason: null,
    };

    db.stats.totalApplications += 1;

    saveDB();

    await dm.send(
      "✅ تم إرسال طلبك للإدارة.\n\n" +
        "⏳ **طلبك قيد المراجعة الآن.**\n" +
        "سيصلك إشعار في الخاص عند صدور القرار."
    );
  } catch (error) {
    console.error("STAFF APPLICATION ERROR:", error);

    await dm
      .send(
        "❌ حدث خطأ أثناء التقديم. حاول مرة أخرى من Channel التقديم."
      )
      .catch(() => {});
  }
}

/* =========================================================
   STAFF APPLICATION DECISIONS
========================================================= */

async function handleStaffAccept(interaction, targetUserId) {
  if (!memberIsAnyStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ ليس لديك صلاحية استخدام هذا الزر.",
      ephemeral: true,
    });
  }

  const application = db.applications[targetUserId];

  if (!application) {
    return interaction.reply({
      content: "❌ لم يتم العثور على الطلب.",
      ephemeral: true,
    });
  }

  if (application.status === "accepted") {
    return interaction.reply({
      content: "⚠️ تم قبول الطلب بالفعل.",
      ephemeral: true,
    });
  }

  if (application.status === "rejected") {
    return interaction.reply({
      content: "⚠️ تم رفض الطلب بالفعل.",
      ephemeral: true,
    });
  }

  const guild = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);

  if (!member) {
    return interaction.reply({
      content: "❌ العضو غير موجود في السيرفر.",
      ephemeral: true,
    });
  }

  const role = guild.roles.cache.get(CONFIG.STAFF_ACCEPTED_ROLE_ID);

  if (!role) {
    return interaction.reply({
      content: "❌ رول القبول غير موجود.",
      ephemeral: true,
    });
  }

  try {
    await member.roles.add(role);
  } catch (error) {
    return interaction.reply({
      content:
        "❌ لم أستطع إعطاء الرول. تأكد أن رول البوت أعلى من الرول المطلوب.",
      ephemeral: true,
    });
  }

  application.status = "accepted";
  application.reviewerId = interaction.user.id;

  saveDB();

  await interaction.update({
    embeds: [
      EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x57f287)
        .setDescription(
          `المتقدم: <@${targetUserId}>\n\n**الحالة: ✅ تم القبول**\nبواسطة: ${interaction.user}`
        )
        .setTimestamp(),
    ],
    components: [buildDisabledStaffButtons(targetUserId)],
  });

  const acceptedChannel = await getChannel(
    CONFIG.STAFF_APPLICATION_ACCEPTED_CHANNEL_ID
  );

  if (acceptedChannel?.isTextBased()) {
    await acceptedChannel.send(
      `✅ تم قبول طلب الإدارة للعضو <@${targetUserId}> بواسطة ${interaction.user}.`
    );
  }

  const user = await client.users.fetch(targetUserId).catch(() => null);

  if (user) {
    await user
      .send(
        `✅ **تم قبولك مبدئيًا في الإدارة** في سيرفر ${CONFIG.SERVER_NAME}.\n\n` +
          `القرار بواسطة: ${interaction.user.tag}`
      )
      .catch(() => {});
  }

  await interaction.followUp({
    content: "✅ تم قبول المتقدم وإعطاؤه الرول.",
    ephemeral: true,
  });
}

async function handleStaffPending(interaction, targetUserId) {
  if (!memberIsAnyStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ ليس لديك صلاحية استخدام هذا الزر.",
      ephemeral: true,
    });
  }

  const application = db.applications[targetUserId];

  if (!application) {
    return interaction.reply({
      content: "❌ لم يتم العثور على الطلب.",
      ephemeral: true,
    });
  }

  application.status = "pending";
  application.reviewerId = interaction.user.id;

  saveDB();

  await interaction.update({
    embeds: [
      EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0xf1c40f)
        .setDescription(
          `المتقدم: <@${targetUserId}>\n\n` +
            `**الحالة: ⏳ قيد المراجعة**\n` +
            `بواسطة: ${interaction.user}`
        )
        .setTimestamp(),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`staff_accept_${targetUserId}`)
          .setLabel("قبول")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`staff_reject_${targetUserId}`)
          .setLabel("رفض")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`staff_pending_${targetUserId}`)
          .setLabel("قيد المراجعة")
          .setEmoji("⏳")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      ),
    ],
  });

  const user = await client.users.fetch(targetUserId).catch(() => null);

  if (user) {
    await user
      .send(
        "⏳ **طلبك قيد المراجعة.**\n\n" +
          "تقوم الإدارة حاليًا بمراجعة طلبك، وسيصلك القرار في الخاص."
      )
      .catch(() => {});
  }

  await interaction.followUp({
    content: "⏳ تم تحويل الطلب إلى قيد المراجعة.",
    ephemeral: true,
  });
}

async function openRejectModal(interaction, targetUserId) {
  if (!memberIsAnyStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ ليس لديك صلاحية استخدام هذا الزر.",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`staff_reject_modal_${targetUserId}`)
    .setTitle("سبب رفض طلب الإدارة");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reject_reason")
    .setLabel("سبب الرفض")
    .setPlaceholder("اكتب سبب الرفض هنا...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(reasonInput)
  );

  await interaction.showModal(modal);
}

async function handleStaffRejectModal(interaction, targetUserId) {
  if (!memberIsAnyStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ ليس لديك صلاحية استخدام هذا الزر.",
      ephemeral: true,
    });
  }

  const application = db.applications[targetUserId];

  if (!application) {
    return interaction.reply({
      content: "❌ لم يتم العثور على الطلب.",
      ephemeral: true,
    });
  }

  const reason =
    interaction.fields.getTextInputValue("reject_reason") ||
    "لم يتم تحديد سبب.";

  application.status = "rejected";
  application.reviewerId = interaction.user.id;
  application.rejectionReason = reason;

  saveDB();

  await interaction.deferUpdate();

  await interaction.message.edit({
    embeds: [
      EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0xed4245)
        .setDescription(
          `المتقدم: <@${targetUserId}>\n\n` +
            `**الحالة: ❌ مرفوض**\n` +
            `بواسطة: ${interaction.user}\n\n` +
            `**سبب الرفض:**\n${reason}`
        )
        .setTimestamp(),
    ],
    components: [buildDisabledStaffButtons(targetUserId)],
  });

  const rejectedChannel = await getChannel(
    CONFIG.STAFF_APPLICATION_REJECTED_CHANNEL_ID
  );

  if (rejectedChannel?.isTextBased()) {
    await rejectedChannel.send(
      `❌ تم رفض طلب الإدارة للعضو <@${targetUserId}> بواسطة ${interaction.user}.\n` +
        `**السبب:** ${reason}`
    );
  }

  const user = await client.users.fetch(targetUserId).catch(() => null);

  if (user) {
    await user
      .send(
        `❌ **تم رفض طلبك للتقديم على الإدارة.**\n\n` +
          `**سبب الرفض:**\n${reason}`
      )
      .catch(() => {});
  }

  await interaction.followUp({
    content: "❌ تم رفض الطلب وإرسال سبب الرفض للمتقدم.",
    ephemeral: true,
  });
}

/* =========================================================
   ATTENDANCE PANEL
========================================================= */

function getActiveAttendanceCount() {
  return Object.values(db.attendance).filter((entry) => entry.active).length;
}

function getActiveVoiceCount() {
  return Object.values(db.attendance).filter(
    (entry) => entry.active && entry.voiceJoinedAt
  ).length;
}

async function setupAttendancePanel() {
  const channel = await getChannel(CONFIG.ATTENDANCE_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("🕐 تسجيل حضور وانصراف الدعم الفني")
    .setDescription(
      "استخدم الأزرار بالأسفل لتسجيل بداية ونهاية وقت العمل.\n\n" +
        `🟢 المتواجدون حاليًا: **${getActiveAttendanceCount()}**\n` +
        `🎧 داخل الرومات الصوتية: **${getActiveVoiceCount()}**\n\n` +
        "يتم احتساب:\n" +
        "• وقت العمل\n" +
        "• وقت التواجد الصوتي\n" +
        "• عدد الشفتات\n" +
        "• نقاط الدعم"
    )
    .setColor(0x57f287)
    .setFooter({
      text: "LEGEND_PANEL:attendance",
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("att_checkin")
      .setLabel("تسجيل دخول")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("att_checkout")
      .setLabel("تسجيل خروج")
      .setEmoji("🔴")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("att_stats")
      .setLabel("إحصائياتي")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("att_leaderboard")
      .setLabel("الترتيب")
      .setEmoji("🏆")
      .setStyle(ButtonStyle.Secondary)
  );

  await upsertPanel("attendance", channel, {
    embeds: [embed],
    components: [row],
  });
}

async function checkIn(interaction) {
  if (!memberIsSupportStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ هذا النظام مخصص لفريق الدعم الفني فقط.",
      ephemeral: true,
    });
  }

  const attendance = getAttendance(interaction.user.id);

  if (attendance.active) {
    return interaction.reply({
      content: `⚠️ أنت مسجل دخول بالفعل منذ ${formatDate(
        attendance.startedAt
      )}.`,
      ephemeral: true,
    });
  }

  const now = Date.now();

  attendance.active = true;
  attendance.startedAt = now;
  attendance.currentStartAt = now;
  attendance.lastCheckIn = now;
  attendance.voiceJoinedAt = interaction.member.voice?.channelId
    ? now
    : null;

  saveDB();

  const logChannel = await getChannel(CONFIG.ATTENDANCE_LOG_CHANNEL_ID);

  if (logChannel?.isTextBased()) {
    await logChannel.send(
      `🟢 **تسجيل دخول**\n` +
        `العضو: ${interaction.user}\n` +
        `الوقت: ${formatDate(now)}`
    );
  }

  await interaction.reply({
    content:
      `✅ تم تسجيل دخولك بنجاح.\n` +
      `🕐 بداية العمل: ${formatDate(now)}\n` +
      `🎧 وقت الصوت يبدأ الاحتساب إذا كنت داخل روم صوتي.`,
    ephemeral: true,
  });

  await setupAttendancePanel();
}

async function checkOut(interaction) {
  if (!memberIsSupportStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ هذا النظام مخصص لفريق الدعم الفني فقط.",
      ephemeral: true,
    });
  }

  const attendance = getAttendance(interaction.user.id);

  if (!attendance.active) {
    return interaction.reply({
      content: "⚠️ أنت غير مسجل دخول حاليًا.",
      ephemeral: true,
    });
  }

  const now = Date.now();

  const totalSeconds = Math.floor(
    (now - attendance.startedAt) / 1000
  );

  if (attendance.voiceJoinedAt) {
    attendance.voiceSeconds += Math.floor(
      (now - attendance.voiceJoinedAt) / 1000
    );
  }

  attendance.totalSeconds += totalSeconds;
  attendance.shifts += 1;
  attendance.points += 1;

  attendance.active = false;
  attendance.currentStartAt = null;
  attendance.voiceJoinedAt = null;
  attendance.lastCheckOut = now;

  saveDB();

  const logChannel = await getChannel(CONFIG.ATTENDANCE_LOG_CHANNEL_ID);

  if (logChannel?.isTextBased()) {
    await logChannel.send(
      `🔴 **تسجيل خروج**\n` +
        `العضو: ${interaction.user}\n` +
        `وقت الدخول: ${formatDate(attendance.startedAt)}\n` +
        `وقت الخروج: ${formatDate(now)}\n` +
        `إجمالي العمل: **${formatDuration(totalSeconds)}**\n` +
        `نقاط: **+1**`
    );
  }

  const user = await client.users.fetch(interaction.user.id).catch(() => null);

  if (user) {
    await user
      .send(
        `🔴 **تم تسجيل خروجك من الدعم الفني**\n\n` +
          `وقت الدخول: ${formatDate(attendance.startedAt)}\n` +
          `وقت الخروج: ${formatDate(now)}\n` +
          `مدة الشفت: **${formatDuration(totalSeconds)}**`
      )
      .catch(() => {});
  }

  await interaction.reply({
    content:
      `✅ تم تسجيل خروجك.\n` +
      `مدة العمل: **${formatDuration(totalSeconds)}**\n` +
      `نقاطك الحالية: **${attendance.points}**`,
    ephemeral: true,
  });

  await setupAttendancePanel();
}

async function showAttendanceStats(interaction) {
  if (!memberIsSupportStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ هذا النظام مخصص لفريق الدعم الفني فقط.",
      ephemeral: true,
    });
  }

  const data = getAttendance(interaction.user.id);

  let currentSession = 0;

  if (data.active && data.startedAt) {
    currentSession = Math.floor((Date.now() - data.startedAt) / 1000);
  }

  let currentVoice = data.voiceSeconds;

  if (data.active && data.voiceJoinedAt) {
    currentVoice += Math.floor(
      (Date.now() - data.voiceJoinedAt) / 1000
    );
  }

  await interaction.reply({
    content:
      `📊 **إحصائياتك**\n\n` +
      `👤 العضو: ${interaction.user}\n` +
      `🟢 الحالة: ${
        data.active ? "متواجد حاليًا" : "غير متواجد"
      }\n` +
      `🕐 مدة العمل الكلية: **${formatDuration(
        data.totalSeconds + currentSession
      )}**\n` +
      `🎧 مدة الصوت الكلية: **${formatDuration(currentVoice)}**\n` +
      `📅 عدد الشفتات: **${data.shifts}**\n` +
      `🎫 التذاكر المستلمة: **${data.ticketsClaimed}**\n` +
      `✅ التذاكر المغلقة: **${data.ticketsClosed}**\n` +
      `🏆 النقاط: **${data.points}**`,
    ephemeral: true,
  });
}

async function showLeaderboard(interaction) {
  if (!memberIsSupportStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ هذا النظام مخصص لفريق الدعم الفني فقط.",
      ephemeral: true,
    });
  }

  const entries = Object.entries(db.attendance)
    .sort(([, a], [, b]) => b.points - a.points)
    .slice(0, 10);

  if (!entries.length) {
    return interaction.reply({
      content: "🏆 لا توجد بيانات حتى الآن.",
      ephemeral: true,
    });
  }

  const lines = [];

  for (let index = 0; index < entries.length; index++) {
    const [userId, data] = entries[index];

    const user = await client.users.fetch(userId).catch(() => null);

    lines.push(
      `${index + 1}. ${user ? user.tag : userId} — **${data.points} نقطة** — ${formatDuration(
        data.totalSeconds
      )}`
    );
  }

  await interaction.reply({
    content: `🏆 **ترتيب الدعم الفني**\n\n${lines.join("\n")}`,
    ephemeral: true,
  });
}

/* =========================================================
   VOICE TRACKING
========================================================= */

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const userId = newState.id;
    const attendance = getAttendance(userId);

    if (!attendance.active) return;

    const member = newState.member;

    if (!member || !memberIsSupportStaff(member)) return;

    const wasInVoice = Boolean(oldState.channelId);
    const isInVoice = Boolean(newState.channelId);

    if (!wasInVoice && isInVoice) {
      attendance.voiceJoinedAt = Date.now();
      saveDB();
    }

    if (wasInVoice && !isInVoice && attendance.voiceJoinedAt) {
      attendance.voiceSeconds += Math.floor(
        (Date.now() - attendance.voiceJoinedAt) / 1000
      );

      attendance.voiceJoinedAt = null;

      saveDB();
    }
  } catch (error) {
    console.error("VOICE TRACKING ERROR:", error);
  }
});

/* =========================================================
   TICKET SYSTEM
========================================================= */

const TICKET_TYPES = {
  technical: "🛠️ الدعم الفني",
  player_report: "🚨 بلاغ عن لاعب",
  bug: "🐛 مشكلة برمجية",
  compensation: "💰 تعويضات",
  admin_complaint: "👮 شكوى ضد إداري",
  store: "🛒 المتجر",
  permit: "📋 طلب تصريح",
  voice: "🎙️ تغيير الصوت",
  appeal: "⚖️ استئناف",
  founders: "👑 تواصل مع المؤسسين",
  lspd: "👮 انضمام إلى شرطة لوس سانتوس",
  lsmc: "🏥 انضمام إلى مستشفى لوس سانتوس",
  high_management: "🏛️ الإدارة العليا",
  general: "🆘 الدعم العام / أي مشكلة",
};

function getTicketPanelOptions() {
  return Object.entries(TICKET_TYPES).map(([value, label]) => ({
    label: label.replace(/^.\s*/, ""),
    value,
  }));
}

async function ensureTicketPanelChannel() {
  const guild = await getGuild();

  if (!guild) return null;

  const category = guild.channels.cache.get(
    CONFIG.TICKET_CATEGORY_ID
  );

  if (!category || category.type !== ChannelType.GuildCategory) {
    console.error("TICKET CATEGORY NOT FOUND.");
    return null;
  }

  let panelChannel = category.children.cache.find(
    (channel) => channel.name === "ticket-panel"
  );

  if (!panelChannel) {
    panelChannel = await guild.channels
      .create({
        name: "ticket-panel",
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
            ],
            deny: [PermissionFlagsBits.SendMessages],
          },
          ...ALL_STAFF_ROLE_IDS.map((roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.SendMessages,
            ],
          })),
        ],
      })
      .catch((error) => {
        console.error("CREATE TICKET PANEL ERROR:", error.message);
        return null;
      });
  }

  return panelChannel;
}

async function setupTicketPanel() {
  const channel = await ensureTicketPanelChannel();

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("🎫 نظام الدعم والتذاكر")
    .setDescription(
      "اختر نوع التذكرة من القائمة بالأسفل.\n\n" +
        "سيتم فتح Ticket خاصة بك ولا يستطيع رؤيتها إلا أنت وفريق الإدارة."
    )
    .setColor(0x5865f2)
    .setFooter({
      text: "LEGEND_PANEL:tickets",
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_type")
    .setPlaceholder("اختر نوع التذكرة")
    .addOptions(getTicketPanelOptions());

  const row = new ActionRowBuilder().addComponents(menu);

  await upsertPanel("tickets", channel, {
    embeds: [embed],
    components: [row],
  });
}

function ticketChannelName(user, type) {
  const safeName =
    user.username
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF_-]/g, "")
      .slice(0, 25) || "user";

  return `ticket-${safeName}-${type}`;
}

async function findExistingTicket(guild, userId) {
  for (const channel of guild.channels.cache.values()) {
    if (
      channel.type !== ChannelType.GuildText ||
      channel.parentId !== CONFIG.TICKET_CATEGORY_ID
    ) {
      continue;
    }

    if (!channel.topic) continue;

    try {
      const data = JSON.parse(channel.topic);

      if (data.ownerId === userId) {
        return channel;
      }
    } catch {
      // ignore invalid topic
    }
  }

  return null;
}

async function createTicket(interaction, type) {
  const guild = interaction.guild;

  if (!guild) {
    return interaction.reply({
      content: "❌ لا يمكن فتح التذكرة هنا.",
      ephemeral: true,
    });
  }

  const existing = await findExistingTicket(guild, interaction.user.id);

  if (existing) {
    return interaction.reply({
      content: `⚠️ لديك تذكرة مفتوحة بالفعل: ${existing}`,
      ephemeral: true,
    });
  }

  const category = guild.channels.cache.get(
    CONFIG.TICKET_CATEGORY_ID
  );

  if (!category) {
    return interaction.reply({
      content: "❌ لم يتم العثور على Category التذاكر.",
      ephemeral: true,
    });
  }

  const channel = await guild.channels
    .create({
      name: ticketChannelName(interaction.user, type),
      type: ChannelType.GuildText,
      parent: category.id,

      topic: JSON.stringify({
        ownerId: interaction.user.id,
        type,
        claimedBy: null,
        createdAt: Date.now(),
      }),

      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },

        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },

        ...CONFIG.TICKET_STAFF_ROLE_IDS.map((roleId) => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        })),

        {
          id: CONFIG.SUPPORT_STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ],
    })
    .catch((error) => {
      console.error("CREATE TICKET ERROR:", error);
      return null;
    });

  if (!channel) {
    return interaction.reply({
      content:
        "❌ لم أستطع إنشاء التذكرة. تأكد من صلاحية **Manage Channels**.",
      ephemeral: true,
    });
  }

  db.tickets[channel.id] = {
    ownerId: interaction.user.id,
    type,
    claimedBy: null,
    createdAt: Date.now(),
  };

  db.stats.totalTickets += 1;

  saveDB();

  const embed = new EmbedBuilder()
    .setTitle("🎫 تم فتح التذكرة")
    .setDescription(
      `${interaction.user}\n\n` +
        `**نوع التذكرة:** ${TICKET_TYPES[type] || TICKET_TYPES.general}\n\n` +
        "يرجى كتابة مشكلتك بالتفصيل وانتظار أحد الإداريين.\n\n" +
        "📥 **استلام** = للإداريين فقط\n" +
        "🔒 **إغلاق** = إغلاق التذكرة"
    )
    .setColor(0x57f287)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("استلام التذكرة")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("إغلاق التذكرة")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [row],
  });

  const logChannel = await getChannel(CONFIG.TICKET_LOG_CHANNEL_ID);

  if (logChannel?.isTextBased()) {
    await logChannel.send(
      `🎫 **تم فتح تذكرة**\n` +
        `العضو: <@${interaction.user.id}>\n` +
        `النوع: ${TICKET_TYPES[type] || type}\n` +
        `التذكرة: ${channel}`
    );
  }

  await interaction.reply({
    content: `✅ تم فتح تذكرتك: ${channel}`,
    ephemeral: true,
  });
}

function readTicketData(channel) {
  if (!channel?.topic) return null;

  try {
    return JSON.parse(channel.topic);
  } catch {
    return null;
  }
}

async function claimTicket(interaction) {
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: "❌ هذه ليست تذكرة.",
      ephemeral: true,
    });
  }

  if (!memberIsTicketStaff(interaction.member)) {
    return interaction.reply({
      content: "❌ استلام التذكرة للإداريين فقط.",
      ephemeral: true,
    });
  }

  const data = readTicketData(channel);

  if (!data) {
    return interaction.reply({
      content: "❌ بيانات التذكرة غير موجودة.",
      ephemeral: true,
    });
  }

  if (data.claimedBy) {
    return interaction.reply({
      content: `⚠️ التذكرة مستلمة بالفعل بواسطة <@${data.claimedBy}>.`,
      ephemeral: true,
    });
  }

  data.claimedBy = interaction.user.id;

  channel
    .setTopic(JSON.stringify(data))
    .catch(() => {});

  if (db.tickets[channel.id]) {
    db.tickets[channel.id].claimedBy = interaction.user.id;
  }

  const attendance = getAttendance(interaction.user.id);

  attendance.ticketsClaimed += 1;
  attendance.points += 1;

  saveDB();

  await interaction.reply(
    `📥 **تم استلام التذكرة بواسطة ${interaction.user}.**`
  );
}

async function closeTicket(interaction) {
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: "❌ هذه ليست تذكرة.",
      ephemeral: true,
    });
  }

  const data = readTicketData(channel);

  if (!data) {
    return interaction.reply({
      content: "❌ بيانات التذكرة غير موجودة.",
      ephemeral: true,
    });
  }

  const isOwner = interaction.user.id === data.ownerId;
  const isStaff = memberIsTicketStaff(interaction.member);

  if (!isOwner && !isStaff) {
    return interaction.reply({
      content: "❌ ليس لديك صلاحية إغلاق هذه التذكرة.",
      ephemeral: true,
    });
  }

  await interaction.reply(
    `🔒 **تم إغلاق التذكرة بواسطة ${interaction.user}.**`
  );

  const messages = await channel.messages
    .fetch({ limit: 100 })
    .catch(() => null);

  let transcriptText =
    `LEGEND CFW - TICKET TRANSCRIPT\n` +
    `Channel: ${channel.name}\n` +
    `Owner ID: ${data.ownerId}\n` +
    `Type: ${data.type}\n` +
    `Claimed By: ${data.claimedBy || "None"}\n` +
    `Closed By: ${interaction.user.id}\n` +
    `Closed At: ${new Date().toISOString()}\n` +
    `\n========================\n\n`;

  if (messages) {
    const sorted = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    for (const message of sorted) {
      transcriptText +=
        `[${new Date(message.createdTimestamp).toLocaleString("ar-EG")}] ` +
        `${message.author.tag}: ${message.content || "[Attachment / Embed]"}\n`;
    }
  }

  const logChannel = await getChannel(CONFIG.TICKET_LOG_CHANNEL_ID);

  if (logChannel?.isTextBased()) {
    const transcript = new AttachmentBuilder(
      Buffer.from(transcriptText, "utf8"),
      {
        name: `transcript-${channel.name}.txt`,
      }
    );

    await logChannel.send({
      content:
        `🔒 **تم إغلاق تذكرة**\n` +
        `العضو: <@${data.ownerId}>\n` +
        `النوع: ${TICKET_TYPES[data.type] || data.type}\n` +
        `المستلم: ${
          data.claimedBy ? `<@${data.claimedBy}>` : "لم يتم الاستلام"
        }\n` +
        `تم الإغلاق بواسطة: ${interaction.user}`,
      files: [transcript],
    });
  }

  if (data.claimedBy) {
    const attendance = getAttendance(data.claimedBy);

    attendance.ticketsClosed += 1;
    attendance.points += 1;

    saveDB();
  }

  const owner = await client.users
    .fetch(data.ownerId)
    .catch(() => null);

  if (owner) {
    await owner
      .send(
        `🔒 **تم إغلاق التذكرة الخاصة بك.**\n\n` +
          `نوع التذكرة: ${TICKET_TYPES[data.type] || data.type}\n` +
          `تم الإغلاق بواسطة: ${interaction.user.tag}`
      )
      .catch(() => {});
  }

  delete db.tickets[channel.id];
  saveDB();

  setTimeout(() => {
    channel.delete("Ticket closed").catch(() => {});
  }, 5000);
}

/* =========================================================
   PERMIT SYSTEM
========================================================= */

async function setupPermitChannel(channelId, mode) {
  const channel = await getChannel(channelId);

  if (!channel || !channel.isTextBased()) return;

  let title = "";
  let description = "";

  if (mode === "accept") {
    title = "✅ قبول تصريح الدخول";
    description =
      "هذا الشانل مخصص للإدارة.\n\n" +
      "اكتب **Discord ID فقط** للعضو.\n" +
      "مثال:\n" +
      "`123456789012345678`\n\n" +
      "سيتم إعطاء رول تصريح الدخول تلقائيًا.";
  }

  if (mode === "reject") {
    title = "❌ رفض تصريح الدخول";
    description =
      "هذا الشانل مخصص للإدارة.\n\n" +
      "اكتب:\n" +
      "`USER_ID | سبب الرفض`\n\n" +
      "مثال:\n" +
      "`123456789012345678 | العمر غير مناسب`";
  }

  if (mode === "pending") {
    title = "⏳ تصريح الدخول - قيد المراجعة";
    description =
      "اكتب **Discord ID فقط** للعضو.\n\n" +
      "سيصل للعضو:\n" +
      "طلبك قيد المراجعة من الإدارة.";
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(
      mode === "accept"
        ? 0x57f287
        : mode === "reject"
        ? 0xed4245
        : 0xf1c40f
    )
    .setFooter({
      text: `LEGEND_PANEL:permit_${mode}`,
    });

  await upsertPanel(`permit_${mode}`, channel, {
    embeds: [embed],
  });
}

async function handlePermitMessage(message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const channelId = message.channel.id;

  let mode = null;

  if (channelId === CONFIG.PERMIT_ACCEPT_CHANNEL_ID) {
    mode = "accept";
  } else if (channelId === CONFIG.PERMIT_REJECT_CHANNEL_ID) {
    mode = "reject";
  } else if (channelId === CONFIG.PERMIT_PENDING_CHANNEL_ID) {
    mode = "pending";
  }

  if (!mode) return;

  if (!memberIsAnyStaff(message.member)) {
    return message.reply("❌ هذا الشانل مخصص للإدارة فقط.");
  }

  const content = message.content.trim();

  if (mode === "accept") {
    if (!/^\d{15,25}$/.test(content)) {
      return message.reply(
        "❌ اكتب Discord ID فقط، مثال: `123456789012345678`"
      );
    }

    const member = await message.guild.members
      .fetch(content)
      .catch(() => null);

    if (!member) {
      return message.reply(
        "❌ العضو غير موجود داخل السيرفر."
      );
    }

    const role = message.guild.roles.cache.get(
      CONFIG.PERMIT_ROLE_ID
    );

    if (!role) {
      return message.reply(
        "❌ رول تصريح الدخول غير موجود."
      );
    }

    try {
      await member.roles.add(role);
    } catch {
      return message.reply(
        "❌ لم أستطع إعطاء الرول. تأكد أن رول البوت أعلى من رول التصريح."
      );
    }

    await message.reply(
      `✅ تم قبول <@${content}> وإعطاؤه رول تصريح الدخول.`
    );

    await member
      .send(
        `✅ **تم قبول تصريح دخولك إلى ${CONFIG.SERVER_NAME}.**\n\n` +
          `تمت الموافقة بواسطة: ${message.author.tag}`
      )
      .catch(() => {});

    return;
  }

  if (mode === "pending") {
    if (!/^\d{15,25}$/.test(content)) {
      return message.reply(
        "❌ اكتب Discord ID فقط."
      );
    }

    const user = await client.users.fetch(content).catch(() => null);

    if (!user) {
      return message.reply("❌ لم أجد هذا العضو.");
    }

    await user
      .send(
        `⏳ **طلبك قيد المراجعة.**\n\n` +
          `جاري مراجعة طلب تصريح دخولك إلى ${CONFIG.SERVER_NAME}.`
      )
      .catch(() => {});

    return message.reply(
      `⏳ تم إرسال حالة **قيد المراجعة** إلى <@${content}>.`
    );
  }

  if (mode === "reject") {
    const parts = content.split("|");

    const userId = parts[0]?.trim();
    const reason =
      parts.slice(1).join("|").trim() ||
      "لم يتم تحديد سبب الرفض.";

    if (!/^\d{15,25}$/.test(userId)) {
      return message.reply(
        "❌ الصيغة الصحيحة:\n`USER_ID | سبب الرفض`"
      );
    }

    const user = await client.users.fetch(userId).catch(() => null);

    if (!user) {
      return message.reply("❌ لم أجد هذا العضو.");
    }

    await user
      .send(
        `❌ **تم رفض طلب تصريح دخولك إلى ${CONFIG.SERVER_NAME}.**\n\n` +
          `**سبب الرفض:**\n${reason}`
      )
      .catch(() => {});

    return message.reply(
      `❌ تم رفض طلب <@${userId}> وإرسال السبب له في الخاص.`
    );
  }
}

/* =========================================================
   PERMIT PANELS
========================================================= */

async function setupPermitPanels() {
  await setupPermitChannel(
    CONFIG.PERMIT_ACCEPT_CHANNEL_ID,
    "accept"
  );

  await setupPermitChannel(
    CONFIG.PERMIT_REJECT_CHANNEL_ID,
    "reject"
  );

  await setupPermitChannel(
    CONFIG.PERMIT_PENDING_CHANNEL_ID,
    "pending"
  );
}

/* =========================================================
   INTERACTIONS
========================================================= */

client.on("interactionCreate", async (interaction) => {
  try {
    /* ---------------- STAFF APPLY ---------------- */

    if (
      interaction.isButton() &&
      interaction.customId === "staff_apply"
    ) {
      return startStaffApplication(interaction);
    }

    /* ---------------- STAFF DECISIONS ---------------- */

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("staff_accept_")
    ) {
      const userId = interaction.customId.replace(
        "staff_accept_",
        ""
      );

      return handleStaffAccept(interaction, userId);
    }

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("staff_reject_")
    ) {
      const userId = interaction.customId.replace(
        "staff_reject_",
        ""
      );

      return openRejectModal(interaction, userId);
    }

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("staff_pending_")
    ) {
      const userId = interaction.customId.replace(
        "staff_pending_",
        ""
      );

      return handleStaffPending(interaction, userId);
    }

    /* ---------------- STAFF REJECT MODAL ---------------- */

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("staff_reject_modal_")
    ) {
      const userId = interaction.customId.replace(
        "staff_reject_modal_",
        ""
      );

      return handleStaffRejectModal(interaction, userId);
    }

    /* ---------------- ATTENDANCE ---------------- */

    if (
      interaction.isButton() &&
      interaction.customId === "att_checkin"
    ) {
      return checkIn(interaction);
    }

    if (
      interaction.isButton() &&
      interaction.customId === "att_checkout"
    ) {
      return checkOut(interaction);
    }

    if (
      interaction.isButton() &&
      interaction.customId === "att_stats"
    ) {
      return showAttendanceStats(interaction);
    }

    if (
      interaction.isButton() &&
      interaction.customId === "att_leaderboard"
    ) {
      return showLeaderboard(interaction);
    }

    /* ---------------- TICKETS ---------------- */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket_type"
    ) {
      const type = interaction.values[0];

      if (!TICKET_TYPES[type]) {
        return interaction.reply({
          content: "❌ نوع التذكرة غير صحيح.",
          ephemeral: true,
        });
      }

      return createTicket(interaction, type);
    }

    if (
      interaction.isButton() &&
      interaction.customId === "ticket_claim"
    ) {
      return claimTicket(interaction);
    }

    if (
      interaction.isButton() &&
      interaction.customId === "ticket_close"
    ) {
      return closeTicket(interaction);
    }
  } catch (error) {
    console.error("INTERACTION ERROR:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            "❌ حدث خطأ غير متوقع. حاول مرة أخرى.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
});

/* =========================================================
   MESSAGE EVENTS
========================================================= */

client.on("messageCreate", async (message) => {
  try {
    await handlePermitMessage(message);
  } catch (error) {
    console.error("MESSAGE ERROR:", error);
  }
});

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {
  console.log("====================================");
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Server System: ${CONFIG.SERVER_NAME}`);
  console.log("====================================");

  client.user.setPresence({
    activities: [
      {
        name: `${CONFIG.SERVER_NAME} | Support System`,
      },
    ],
    status: "online",
  });

  await setupStaffApplicationPanel();
  await setupAttendancePanel();
  await setupTicketPanel();
  await setupPermitPanels();

  console.log("All panels have been checked.");
});

/* =========================================================
   PERIODIC PANEL UPDATE
========================================================= */

setInterval(async () => {
  try {
    await setupAttendancePanel();
  } catch (error) {
    console.error("ATTENDANCE UPDATE ERROR:", error.message);
  }
}, 60 * 1000);

/* =========================================================
   ERROR HANDLERS
========================================================= */

process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED REJECTION:", error);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

/* =========================================================
   LOGIN
========================================================= */

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);

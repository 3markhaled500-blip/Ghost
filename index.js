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
} = require("discord.js");

/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {
  SERVER_NAME: "Ghost CFW",

  // Welcome
  WELCOME_CHANNEL_ID: "1538611932624453783",
  AUTO_ROLE_ID: "1535765156494319726",

  // Staff Application
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
    "1535755234989572226"
  ],

  SUPPORT_STAFF_ROLE_ID: "1535755112969015367"
};

const TICKET_STAFF_ROLE_IDS = [
  ...CONFIG.TICKET_STAFF_ROLE_IDS,
  CONFIG.SUPPORT_STAFF_ROLE_ID
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
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel
  ]
});

/* =========================================================
   DATABASE
   ========================================================= */

const DB_FILE = path.join(__dirname, "database.json");

const defaultDB = {
  applications: {},
  attendance: {},
  tickets: {},
  panels: {}
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(defaultDB, null, 2)
      );

      return JSON.parse(
        JSON.stringify(defaultDB)
      );
    }

    const data = JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );

    return {
      ...defaultDB,
      ...data,
      applications: data.applications || {},
      attendance: data.attendance || {},
      tickets: data.tickets || {},
      panels: data.panels || {}
    };
  } catch (error) {
    console.error(
      "DATABASE ERROR:",
      error
    );

    return JSON.parse(
      JSON.stringify(defaultDB)
    );
  }
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(db, null, 2)
    );
  } catch (error) {
    console.error(
      "SAVE DATABASE ERROR:",
      error
    );
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatDate(timestamp) {
  if (!timestamp) return "غير معروف";

  return new Date(timestamp).toLocaleString(
    "ar-EG",
    {
      timeZone: "Africa/Cairo",
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}

function formatDuration(seconds) {
  seconds = Math.max(
    0,
    Math.floor(seconds)
  );

  const hours = Math.floor(
    seconds / 3600
  );

  seconds %= 3600;

  const minutes = Math.floor(
    seconds / 60
  );

  const sec = seconds % 60;

  const parts = [];

  if (hours) {
    parts.push(`${hours} ساعة`);
  }

  if (minutes) {
    parts.push(`${minutes} دقيقة`);
  }

  if (
    sec ||
    parts.length === 0
  ) {
    parts.push(`${sec} ثانية`);
  }

  return parts.join(" و ");
}

async function getChannel(id) {
  try {
    return await client.channels.fetch(id);
  } catch {
    return null;
  }
}

function isAdmin(member) {
  if (!member) return false;

  return member.permissions?.has(
    PermissionFlagsBits.Administrator
  );
}

function isTicketStaff(member) {
  if (!member) return false;

  if (isAdmin(member)) {
    return true;
  }

  return TICKET_STAFF_ROLE_IDS.some(
    (roleId) =>
      member.roles.cache.has(roleId)
  );
}

function isSupportStaff(member) {
  if (!member) return false;

  if (isAdmin(member)) {
    return true;
  }

  return member.roles.cache.has(
    CONFIG.SUPPORT_STAFF_ROLE_ID
  );
}

function getAttendance(userId) {
  if (!db.attendance[userId]) {
    db.attendance[userId] = {
      active: false,
      startedAt: null,
      totalSeconds: 0,
      voiceJoinedAt: null,
      voiceSeconds: 0,
      shifts: 0,
      points: 0,
      ticketsClaimed: 0,
      ticketsClosed: 0
    };
  }

  return db.attendance[userId];
}

async function sendLog(text) {
  const channel = await getChannel(
    CONFIG.ATTENDANCE_LOG_CHANNEL_ID
  );

  if (channel?.isTextBased()) {
    await channel
      .send(text)
      .catch(() => {});
  }
}

async function sendTicketLog(payload) {
  const channel = await getChannel(
    CONFIG.TICKET_LOG_CHANNEL_ID
  );

  if (channel?.isTextBased()) {
    await channel
      .send(payload)
      .catch(() => {});
  }
}

/* =========================================================
   WELCOME
   ========================================================= */

client.on(
  "guildMemberAdd",
  async (member) => {
    try {
      const role =
        member.guild.roles.cache.get(
          CONFIG.AUTO_ROLE_ID
        );

      if (role) {
        await member.roles
          .add(role)
          .catch(() => {});
      }

      const channel =
        member.guild.channels.cache.get(
          CONFIG.WELCOME_CHANNEL_ID
        );

      if (!channel?.isTextBased()) {
        return;
      }

      const embed =
        new EmbedBuilder()
          .setTitle(
            `أهلاً بك في ${CONFIG.SERVER_NAME}`
          )
          .setDescription(
            `مرحبًا ${member}\n\n` +
            `نتمنى لك وقتًا ممتعًا في السيرفر.\n` +
            `يرجى الالتزام بالقوانين والتعليمات.`
          )
          .addFields({
            name: "العضو",
            value: `${member}`,
            inline: true
          })
          .setColor(0x5865f2)
          .setTimestamp();

      await channel.send({
        content: `مرحبًا ${member}`,
        embeds: [embed]
      });
    } catch (error) {
      console.error(
        "WELCOME ERROR:",
        error
      );
    }
  }
);

/* =========================================================
   STAFF APPLICATION
   ========================================================= */

const applicationQuestions = [
  "ما اسمك؟",
  "كم عمرك؟",
  "ما اسمك في FiveM؟",
  "ما خبرتك السابقة في الإدارة؟",
  "لماذا تريد الانضمام إلى الإدارة؟",
  "كم ساعة تستطيع التواجد يوميًا؟",
  "هل تستطيع الالتزام بقوانين الإدارة؟",
  "احكِ لنا موقفًا إداريًا وكيف ستتعامل معه؟"
];

async function setupApplicationPanel() {
  const channel =
    await getChannel(
      CONFIG.STAFF_APPLICATION_CHANNEL_ID
    );

  if (!channel?.isTextBased()) {
    return;
  }

  const embed =
    new EmbedBuilder()
      .setTitle("📋 التقديم على الإدارة")
      .setDescription(
        "اضغط على الزر بالأسفل لبدء التقديم.\n\n" +
        "سيتم إرسال جميع الأسئلة إليك في الخاص DM.\n" +
        "بعد الانتهاء سيتم إرسال الطلب للإدارة للمراجعة."
      )
      .setColor(0x5865f2)
      .setFooter({
        text:
          "Ghost CFW • Staff Applications"
      });

  const row =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "start_staff_application"
          )
          .setLabel(
            "تقديم على الإدارة"
          )
          .setEmoji("📋")
          .setStyle(
            ButtonStyle.Primary
          )
      );

  const messages =
    await channel.messages
      .fetch({ limit: 50 })
      .catch(() => null);

  let oldMessage = null;

  if (messages) {
    oldMessage = messages.find(
      (msg) =>
        msg.author.id ===
          client.user.id &&
        msg.embeds[0]?.title ===
          "📋 التقديم على الإدارة"
    );
  }

  if (oldMessage) {
    await oldMessage.edit({
      embeds: [embed],
      components: [row]
    });
  } else {
    await channel.send({
      embeds: [embed],
      components: [row]
    });
  }
}

/* =========================================================
   START APPLICATION
   ========================================================= */

async function startApplication(
  interaction
) {
  const userId =
    interaction.user.id;

  if (
    db.applications[userId]?.status ===
    "pending"
  ) {
    return interaction.reply({
      content:
        "⚠️ لديك طلب تقديم موجود بالفعل وقيد المراجعة.",
      ephemeral: true
    });
  }

  let dm;

  try {
    dm =
      await interaction.user.createDM();

    await dm.send(
      "📋 **بدأ التقديم على الإدارة**"
    );
  } catch {
    return interaction.reply({
      content:
        "❌ لا أستطيع إرسال DM لك. افتح استقبال الرسائل الخاصة وحاول مرة أخرى.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content:
      "✅ تم بدء التقديم. راجع الرسائل الخاصة DM.",
    ephemeral: true
  });

  const answers = {};

  for (
    let i = 0;
    i < applicationQuestions.length;
    i++
  ) {
    await dm.send(
      `**السؤال ${i + 1}/${applicationQuestions.length}**\n` +
      applicationQuestions[i]
    );

    const collected =
      await dm.awaitMessages({
        filter: (message) =>
          message.author.id ===
            interaction.user.id &&
          !message.author.bot,
        max: 1,
        time:
          10 * 60 * 1000
      }).catch(() => null);

    if (
      !collected ||
      collected.size === 0
    ) {
      await dm.send(
        "❌ انتهى وقت التقديم لعدم وجود رد."
      );

      return;
    }

    answers[i + 1] =
      collected.first().content;
  }

  const reviewChannel =
    await getChannel(
      CONFIG.STAFF_APPLICATION_REVIEW_CHANNEL_ID
    );

  if (!reviewChannel?.isTextBased()) {
    await dm.send(
      "❌ حدث خطأ في Channel المراجعة."
    );

    return;
  }

  const embed =
    new EmbedBuilder()
      .setTitle(
        "📋 طلب إدارة جديد"
      )
      .setDescription(
        `المتقدم: <@${userId}>\n` +
        `ID: \`${userId}\``
      )
      .addFields(
        {
          name: "الاسم",
          value:
            answers[1] || "—"
        },
        {
          name: "العمر",
          value:
            answers[2] || "—"
        },
        {
          name: "اسم FiveM",
          value:
            answers[3] || "—"
        },
        {
          name: "الخبرة",
          value:
            answers[4] || "—"
        },
        {
          name: "سبب التقديم",
          value:
            answers[5] || "—"
        },
        {
          name: "التواجد اليومي",
          value:
            answers[6] || "—"
        },
        {
          name: "الالتزام",
          value:
            answers[7] || "—"
        },
        {
          name: "الموقف الإداري",
          value:
            answers[8] || "—"
        }
      )
      .setColor(0xf1c40f)
      .setTimestamp();

  const row =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `app_accept_${userId}`
          )
          .setLabel("قبول")
          .setEmoji("✅")
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            `app_reject_${userId}`
          )
          .setLabel("رفض")
          .setEmoji("❌")
          .setStyle(
            ButtonStyle.Danger
          ),

        new ButtonBuilder()
          .setCustomId(
            `app_pending_${userId}`
          )
          .setLabel(
            "قيد المراجعة"
          )
          .setEmoji("⏳")
          .setStyle(
            ButtonStyle.Secondary
          )
      );

  const sent =
    await reviewChannel.send({
      embeds: [embed],
      components: [row]
    });

  db.applications[userId] = {
    status: "pending",
    answers,
    messageId: sent.id,
    createdAt: Date.now(),
    reviewedBy: null,
    rejectionReason: null
  };

  saveDB();

  await dm.send(
    "✅ **تم إرسال طلبك للإدارة.**\n\n" +
    "⏳ طلبك الآن **قيد المراجعة**.\n" +
    "سيصلك القرار في الخاص."
  );
}

/* =========================================================
   APPLICATION ACCEPT
   ========================================================= */

async function acceptApplication(
  interaction,
  userId
) {
  if (
    !isAdmin(interaction.member) &&
    !isTicketStaff(interaction.member)
  ) {
    return interaction.reply({
      content:
        "❌ ليس لديك صلاحية.",
      ephemeral: true
    });
  }

  const application =
    db.applications[userId];

  if (!application) {
    return interaction.reply({
      content:
        "❌ الطلب غير موجود.",
      ephemeral: true
    });
  }

  const member =
    await interaction.guild.members
      .fetch(userId)
      .catch(() => null);

  if (!member) {
    return interaction.reply({
      content:
        "❌ العضو غير موجود في السيرفر.",
      ephemeral: true
    });
  }

  const role =
    interaction.guild.roles.cache.get(
      CONFIG.STAFF_ACCEPTED_ROLE_ID
    );

  if (!role) {
    return interaction.reply({
      content:
        "❌ رول القبول غير موجود.",
      ephemeral: true
    });
  }

  try {
    await member.roles.add(role);
  } catch {
    return interaction.reply({
      content:
        "❌ لم أستطع إعطاء الرول. تأكد أن رول البوت أعلى من الرول المطلوب.",
      ephemeral: true
    });
  }

  application.status =
    "accepted";

  application.reviewedBy =
    interaction.user.id;

  saveDB();

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "📋 طلب إدارة"
        )
        .setDescription(
          `المتقدم: <@${userId}>\n\n` +
          `✅ **تم القبول**\n` +
          `بواسطة: ${interaction.user}\n\n` +
          `🏙️ **مدينة ${CONFIG.SERVER_NAME}**`
        )
        .setColor(0x57f287)
        .setTimestamp()
    ],
    components: []
  });

  const acceptedChannel =
    await getChannel(
      CONFIG.STAFF_APPLICATION_ACCEPTED_CHANNEL_ID
    );

  if (
    acceptedChannel?.isTextBased()
  ) {
    await acceptedChannel.send(
      `✅ تم قبول طلب <@${userId}> في الإدارة في **مدينة ${CONFIG.SERVER_NAME}** بواسطة ${interaction.user}.`
    );
  }

  const user =
    await client.users
      .fetch(userId)
      .catch(() => null);

  if (user) {
    await user.send(
      `✅ **تم قبولك في الإدارة في مدينة ${CONFIG.SERVER_NAME}.**\n\n` +
      `تمت الموافقة على طلبك للانضمام إلى إدارة **مدينة ${CONFIG.SERVER_NAME}**.`
    ).catch(() => {});
  }

  await interaction.followUp({
    content:
      `✅ تم قبول المتقدم وإعطاؤه الرول في **مدينة ${CONFIG.SERVER_NAME}**.`,
    ephemeral: true
  });
}

/* =========================================================
   APPLICATION PENDING
   ========================================================= */

async function pendingApplication(
  interaction,
  userId
) {
  if (
    !isAdmin(interaction.member) &&
    !isTicketStaff(interaction.member)
  ) {
    return interaction.reply({
      content:
        "❌ ليس لديك صلاحية.",
      ephemeral: true
    });
  }

  const application =
    db.applications[userId];

  if (!application) {
    return interaction.reply({
      content:
        "❌ الطلب غير موجود.",
      ephemeral: true
    });
  }

  application.status =
    "pending";

  application.reviewedBy =
    interaction.user.id;

  saveDB();

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle(
          "📋 طلب إدارة"
        )
        .setDescription(
          `المتقدم: <@${userId}>\n\n` +
          `⏳ **قيد المراجعة**\n` +
          `بواسطة: ${interaction.user}`
        )
        .setColor(0xf1c40f)
        .setTimestamp()
    ]
  });

  const user =
    await client.users
      .fetch(userId)
      .catch(() => null);

  if (user) {
    await user.send(
      `⏳ **طلبك قيد المراجعة في مدينة ${CONFIG.SERVER_NAME}.**\n\n` +
      `الإدارة تقوم بمراجعة طلبك حاليًا.`
    ).catch(() => {});
  }

  await interaction.followUp({
    content:
      "⏳ تم تحويل الطلب إلى قيد المراجعة.",
    ephemeral: true
  });
}

/* =========================================================
   APPLICATION REJECT
   ========================================================= */

async function rejectApplicationModal(
  interaction,
  userId
) {
  if (
    !isAdmin(interaction.member) &&
    !isTicketStaff(interaction.member)
  ) {
    return interaction.reply({
      content:
        "❌ ليس لديك صلاحية.",
      ephemeral: true
    });
  }

  const modal =
    new ModalBuilder()
      .setCustomId(
        `reject_reason_${userId}`
      )
      .setTitle(
        "سبب رفض التقديم"
      );

  const input =
    new TextInputBuilder()
      .setCustomId("reason")
      .setLabel(
        "سبب الرفض"
      )
      .setPlaceholder(
        "اكتب سبب الرفض..."
      )
      .setStyle(
        TextInputStyle.Paragraph
      )
      .setRequired(true)
      .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder()
      .addComponents(input)
  );

  await interaction.showModal(
    modal
  );
}

async function finishRejectApplication(
  interaction,
  userId
) {
  const application =
    db.applications[userId];

  if (!application) {
    return interaction.reply({
      content:
        "❌ الطلب غير موجود.",
      ephemeral: true
    });
  }

  const reason =
    interaction.fields.getTextInputValue(
      "reason"
    );

  application.status =
    "rejected";

  application.reviewedBy =
    interaction.user.id;

  application.rejectionReason =
    reason;

  saveDB();

  const rejectedChannel =
    await getChannel(
      CONFIG.STAFF_APPLICATION_REJECTED_CHANNEL_ID
    );

  if (
    rejectedChannel?.isTextBased()
  ) {
    await rejectedChannel.send(
      `❌ تم رفض طلب <@${userId}> في **مدينة ${CONFIG.SERVER_NAME}**\n` +
      `بواسطة: ${interaction.user}\n` +
      `**السبب:** ${reason}`
    );
  }

  const user =
    await client.users
      .fetch(userId)
      .catch(() => null);

  if (user) {
    await user.send(
      `❌ **تم رفضك من الإدارة في مدينة ${CONFIG.SERVER_NAME}.**\n\n` +
      `**سبب الرفض:**\n${reason}`
    ).catch(() => {});
  }

  await interaction.reply({
    content:
      `❌ تم رفض الطلب وإرسال السبب للمتقدم في **مدينة ${CONFIG.SERVER_NAME}**.`,
    ephemeral: true
  });
}

/* =========================================================
   ATTENDANCE PANEL
   ========================================================= */

async function setupAttendancePanel() {
  const channel =
    await getChannel(
      CONFIG.ATTENDANCE_CHANNEL_ID
    );

  if (!channel?.isTextBased()) {
    return;
  }

  const activeCount =
    Object.values(db.attendance)
      .filter((x) => x.active)
      .length;

  const voiceCount =
    Object.values(db.attendance)
      .filter(
        (x) =>
          x.active &&
          x.voiceJoinedAt
      )
      .length;

  const embed =
    new EmbedBuilder()
      .setTitle(
        "🕐 تسجيل الدخول والخروج"
      )
      .setDescription(
        "نظام حضور وانصراف الدعم الفني\n\n" +
        `🟢 المتواجدون الآن: **${activeCount}**\n` +
        `🎧 داخل الرومات: **${voiceCount}**\n\n` +
        "اضغط تسجيل دخول لبدء وقت العمل.\n" +
        "اضغط تسجيل خروج لإنهاء وقت العمل."
      )
      .setColor(0x57f287)
      .setFooter({
        text:
          "Ghost CFW • Support Attendance"
      });

  const row =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "attendance_in"
          )
          .setLabel(
            "تسجيل دخول"
          )
          .setEmoji("🟢")
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            "attendance_out"
          )
          .setLabel(
            "تسجيل خروج"
          )
          .setEmoji("🔴")
          .setStyle(
            ButtonStyle.Danger
          ),

        new ButtonBuilder()
          .setCustomId(
            "attendance_stats"
          )
          .setLabel(
            "إحصائياتي"
          )
          .setEmoji("📊")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "attendance_top"
          )
          .setLabel(
            "الترتيب"
          )
          .setEmoji("🏆")
          .setStyle(
            ButtonStyle.Secondary
          )
      );

  const messages =
    await channel.messages
      .fetch({ limit: 50 })
      .catch(() => null);

  let oldMessage = null;

  if (messages) {
    oldMessage = messages.find(
      (msg) =>
        msg.author.id ===
          client.user.id &&
        msg.embeds[0]?.title ===
          "🕐 تسجيل الدخول والخروج"
    );
  }

  if (oldMessage) {
    await oldMessage.edit({
      embeds: [embed],
      components: [row]
    });
  } else {
    await channel.send({
      embeds: [embed],
      components: [row]
    });
  }
}

/* =========================================================
   CHECK IN
   ========================================================= */

async function attendanceIn(
  interaction
) {
  if (
    !isSupportStaff(
      interaction.member
    )
  ) {
    return interaction.reply({
      content:
        "❌ هذا النظام خاص بفريق الدعم الفني.",
      ephemeral: true
    });
  }

  const data =
    getAttendance(
      interaction.user.id
    );

  if (data.active) {
    return interaction.reply({
      content:
        `⚠️ أنت مسجل دخول بالفعل منذ ${formatDate(data.startedAt)}.`,
      ephemeral: true
    });
  }

  const now = Date.now();

  data.active = true;
  data.startedAt = now;

  data.voiceJoinedAt =
    interaction.member.voice.channelId
      ? now
      : null;

  saveDB();

  await sendLog(
    `🟢 **تسجيل دخول دعم فني**\n` +
    `العضو: ${interaction.user}\n` +
    `الوقت: ${formatDate(now)}`
  );

  await interaction.reply({
    content:
      `✅ تم تسجيل الدخول.\n` +
      `🕐 بداية العمل: ${formatDate(now)}`,
    ephemeral: true
  });

  await setupAttendancePanel();
}

/* =========================================================
   CHECK OUT
   ========================================================= */

async function attendanceOut(
  interaction
) {
  if (
    !isSupportStaff(
      interaction.member
    )
  ) {
    return interaction.reply({
      content:
        "❌ هذا النظام خاص بفريق الدعم الفني.",
      ephemeral: true
    });
  }

  const data =
    getAttendance(
      interaction.user.id
    );

  if (!data.active) {
    return interaction.reply({
      content:
        "⚠️ أنت غير مسجل دخول حاليًا.",
      ephemeral: true
    });
  }

  const now = Date.now();

  const workSeconds =
    Math.floor(
      (now - data.startedAt) /
        1000
    );

  if (data.voiceJoinedAt) {
    data.voiceSeconds +=
      Math.floor(
        (now - data.voiceJoinedAt) /
          1000
      );
  }

  data.totalSeconds +=
    workSeconds;

  data.shifts += 1;
  data.points += 1;

  data.active = false;
  data.startedAt = null;
  data.voiceJoinedAt = null;

  saveDB();

  await sendLog(
    `🔴 **تسجيل خروج دعم فني**\n` +
    `العضو: ${interaction.user}\n` +
    `وقت الخروج: ${formatDate(now)}\n` +
    `مدة الشفت: **${formatDuration(workSeconds)}**`
  );

  await interaction.user.send(
    `🔴 **تم تسجيل خروجك من الدعم الفني**\n\n` +
    `مدة الشفت: **${formatDuration(workSeconds)}**\n` +
    `إجمالي وقت العمل: **${formatDuration(data.totalSeconds)}**\n` +
    `النقاط: **${data.points}**`
  ).catch(() => {});

  await interaction.reply({
    content:
      `✅ تم تسجيل الخروج.\n` +
      `مدة العمل: **${formatDuration(workSeconds)}**`,
    ephemeral: true
  });

  await setupAttendancePanel();
}

/* =========================================================
   ATTENDANCE STATS
   ========================================================= */

async function attendanceStats(
  interaction
) {
  if (
    !isSupportStaff(
      interaction.member
    )
  ) {
    return interaction.reply({
      content:
        "❌ هذا النظام للدعم الفني فقط.",
      ephemeral: true
    });
  }

  const data =
    getAttendance(
      interaction.user.id
    );

  let liveSeconds = 0;

  if (data.active) {
    liveSeconds =
      Math.floor(
        (Date.now() -
          data.startedAt) /
          1000
      );
  }

  await interaction.reply({
    content:
      `📊 **إحصائيات ${interaction.user.username}**\n\n` +
      `🟢 الحالة: **${data.active ? "متواجد" : "غير متواجد"}**\n` +
      `🕐 إجمالي وقت العمل: **${formatDuration(data.totalSeconds + liveSeconds)}**\n` +
      `🎧 إجمالي وقت الصوت: **${formatDuration(data.voiceSeconds)}**\n` +
      `📅 عدد الشفتات: **${data.shifts}**\n` +
      `🎫 التذاكر المستلمة: **${data.ticketsClaimed}**\n` +
      `✅ التذاكر المغلقة: **${data.ticketsClosed}**\n` +
      `🏆 النقاط: **${data.points}**`,
    ephemeral: true
  });
}

/* =========================================================
   LEADERBOARD
   ========================================================= */

async function attendanceTop(
  interaction
) {
  if (
    !isSupportStaff(
      interaction.member
    )
  ) {
    return interaction.reply({
      content:
        "❌ هذا النظام للدعم الفني فقط.",
      ephemeral: true
    });
  }

  const list =
    Object.entries(db.attendance)
      .sort(
        (a, b) =>
          b[1].points -
          a[1].points
      )
      .slice(0, 10);

  if (!list.length) {
    return interaction.reply({
      content:
        "🏆 لا توجد بيانات حتى الآن.",
      ephemeral: true
    });
  }

  const lines = [];

  for (
    let i = 0;
    i < list.length;
    i++
  ) {
    const [
      userId,
      data
    ] = list[i];

    const user =
      await client.users
        .fetch(userId)
        .catch(() => null);

    lines.push(
      `${i + 1}. ${user ? user.tag : userId} — **${data.points} نقطة**`
    );
  }

  await interaction.reply({
    content:
      `🏆 **ترتيب الدعم الفني**\n\n` +
      lines.join("\n"),
    ephemeral: true
  });
}

/* =========================================================
   VOICE TRACKING
   ========================================================= */

client.on(
  "voiceStateUpdate",
  async (oldState, newState) => {
    try {
      const member =
        newState.member;

      if (
        !member ||
        !isSupportStaff(member)
      ) {
        return;
      }

      const data =
        getAttendance(member.id);

      if (!data.active) {
        return;
      }

      const oldChannel =
        oldState.channelId;

      const newChannel =
        newState.channelId;

      if (
        !oldChannel &&
        newChannel
      ) {
        data.voiceJoinedAt =
          Date.now();

        saveDB();
      }

      if (
        oldChannel &&
        !newChannel
      ) {
        if (data.voiceJoinedAt) {
          data.voiceSeconds +=
            Math.floor(
              (Date.now() -
                data.voiceJoinedAt) /
                1000
            );

          data.voiceJoinedAt =
            null;

          saveDB();
        }
      }
    } catch (error) {
      console.error(
        "VOICE ERROR:",
        error
      );
    }
  }
);

/* =========================================================
   TICKET TYPES
   ========================================================= */

const TICKET_TYPES = {
  general: "🆘 الدعم العام",
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
  high_management: "🏛️ الإدارة العليا"
};

/* =========================================================
   TICKET HELPERS
   ========================================================= */

function getValidTicketStaffRoles(
  guild
) {
  return TICKET_STAFF_ROLE_IDS.filter(
    (roleId) => {
      const role =
        guild.roles.cache.get(
          roleId
        );

      if (!role) {
        console.warn(
          `⚠️ Ticket role not found: ${roleId}`
        );

        return false;
      }

      return true;
    }
  );
}

function getBotMember(guild) {
  return (
    guild.members.me ||
    guild.members.cache.get(
      client.user.id
    )
  );
}

function checkTicketPermissions(
  guild,
  category
) {
  const botMember =
    getBotMember(guild);

  if (!botMember) {
    return {
      ok: false,
      reason:
        "❌ لم أستطع العثور على Member الخاص بالبوت داخل السيرفر."
    };
  }

  const permissions =
    category.permissionsFor(
      botMember
    );

  if (!permissions) {
    return {
      ok: false,
      reason:
        "❌ لم أستطع قراءة صلاحيات البوت داخل Category التذاكر."
    };
  }

  const requiredPermissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageChannels
  ];

  const missing =
    requiredPermissions.filter(
      (permission) =>
        !permissions.has(
          permission
        )
    );

  if (missing.length > 0) {
    return {
      ok: false,
      reason:
        "❌ البوت لا يمتلك الصلاحيات المطلوبة داخل Category التذاكر.\n\n" +
        "الصلاحيات المطلوبة:\n" +
        "• View Channel\n" +
        "• Send Messages\n" +
        "• Read Message History\n" +
        "• Manage Channels"
    };
  }

  return {
    ok: true
  };
}

/* =========================================================
   TICKET PANEL
   ========================================================= */

async function setupTicketPanel() {
  const guild =
    client.guilds.cache.first();

  if (!guild) {
    console.error(
      "❌ لم يتم العثور على السيرفر."
    );

    return;
  }

  const category =
    guild.channels.cache.get(
      CONFIG.TICKET_CATEGORY_ID
    );

  if (
    !category ||
    category.type !==
      ChannelType.GuildCategory
  ) {
    console.error(
      `❌ Ticket category غير موجودة: ${CONFIG.TICKET_CATEGORY_ID}`
    );

    return;
  }

  const permissionCheck =
    checkTicketPermissions(
      guild,
      category
    );

  if (!permissionCheck.ok) {
    console.error(
      "❌ TICKET PERMISSIONS ERROR:",
      permissionCheck.reason
    );

    return;
  }

  const validStaffRoles =
    getValidTicketStaffRoles(
      guild
    );

  let panel =
    category.children.cache.find(
      (channel) =>
        channel.name ===
        "ticket-panel"
    );

  if (!panel) {
    try {
      panel =
        await guild.channels.create({
          name: "ticket-panel",
          type: ChannelType.GuildText,
          parent: category.id,

          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory
              ],

              deny: [
                PermissionFlagsBits.SendMessages
              ]
            },

            ...validStaffRoles.map(
              (roleId) => ({
                id: roleId,

                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.SendMessages
                ]
              })
            )
          ]
        });
    } catch (error) {
      console.error(
        "❌ CREATE TICKET PANEL ERROR:",
        error
      );

      return;
    }
  }

  if (!panel) return;

  const options =
    Object.entries(
      TICKET_TYPES
    ).map(
      ([value, label]) => ({
        label:
          label.substring(2),
        value
      })
    );

  const embed =
    new EmbedBuilder()
      .setTitle(
        "🎫 نظام التذاكر"
      )
      .setDescription(
        `مرحبًا بك في **${CONFIG.SERVER_NAME}**.\n\n` +
        "اختار نوع التذكرة من القائمة بالأسفل.\n" +
        "سيتم فتح تذكرة خاصة بك مع الإدارة.\n\n" +
        "⚠️ يرجى عدم فتح تذاكر بدون سبب."
      )
      .setColor(0x5865f2)
      .setFooter({
        text:
          `${CONFIG.SERVER_NAME} • Tickets`
      });

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "ticket_select"
      )
      .setPlaceholder(
        "اختار نوع التذكرة"
      )
      .addOptions(options);

  const row =
    new ActionRowBuilder()
      .addComponents(menu);

  const messages =
    await panel.messages
      .fetch({ limit: 50 })
      .catch(() => null);

  let oldMessage = null;

  if (messages) {
    oldMessage = messages.find(
      (msg) =>
        msg.author.id ===
          client.user.id &&
        msg.embeds[0]?.title ===
          "🎫 نظام التذاكر"
    );
  }

  if (oldMessage) {
    await oldMessage.edit({
      embeds: [embed],
      components: [row]
    }).catch((error) => {
      console.error(
        "❌ EDIT TICKET PANEL ERROR:",
        error
      );
    });
  } else {
    await panel.send({
      embeds: [embed],
      components: [row]
    }).catch((error) => {
      console.error(
        "❌ SEND TICKET PANEL ERROR:",
        error
      );
    });
  }

  console.log(
    `✅ Ticket system loaded in ${guild.name}`
  );
}

/* =========================================================
   FIND USER TICKET
   ========================================================= */

async function findUserTicket(
  guild,
  userId
) {
  const channels =
    guild.channels.cache.values();

  for (
    const channel of channels
  ) {
    if (
      channel.type !==
        ChannelType.GuildText ||
      channel.parentId !==
        CONFIG.TICKET_CATEGORY_ID
    ) {
      continue;
    }

    if (!channel.topic) {
      continue;
    }

    try {
      const data =
        JSON.parse(
          channel.topic
        );

      if (
        data.ownerId ===
        userId
      ) {
        return channel;
      }
    } catch {}
  }

  return null;
}

/* =========================================================
   CREATE TICKET
   ========================================================= */

async function createTicket(
  interaction,
  type
) {
  const guild =
    interaction.guild;

  if (!guild) {
    return interaction.reply({
      content:
        "❌ لم أستطع العثور على السيرفر.",
      ephemeral: true
    });
  }

  const existing =
    await findUserTicket(
      guild,
      interaction.user.id
    );

  if (existing) {
    return interaction.reply({
      content:
        `⚠️ لديك تذكرة مفتوحة بالفعل: ${existing}`,
      ephemeral: true
    });
  }

  const category =
    guild.channels.cache.get(
      CONFIG.TICKET_CATEGORY_ID
    );

  if (
    !category ||
    category.type !==
      ChannelType.GuildCategory
  ) {
    return interaction.reply({
      content:
        "❌ Category التذاكر غير موجودة أو الـID غير صحيح.",
      ephemeral: true
    });
  }

  const botMember =
    getBotMember(guild);

  if (!botMember) {
    return interaction.reply({
      content:
        "❌ لم أستطع العثور على البوت داخل السيرفر.",
      ephemeral: true
    });
  }

  const permissions =
    category.permissionsFor(
      botMember
    );

  if (
    !permissions?.has(
      PermissionFlagsBits.ManageChannels
    )
  ) {
    return interaction.reply({
      content:
        "❌ البوت لا يمتلك صلاحية **Manage Channels** داخل Category التذاكر.\n\n" +
        "أعطِ البوت:\n" +
        "• Manage Channels\n" +
        "• View Channel\n" +
        "• Send Messages\n" +
        "• Read Message History",
      ephemeral: true
    });
  }

  const validStaffRoles =
    getValidTicketStaffRoles(
      guild
    );

  const safeName =
    interaction.user.username
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]/g,
        ""
      )
      .slice(0, 20) ||
    "user";

  let channel;

  try {
    channel =
      await guild.channels.create({
        name:
          `ticket-${safeName}`,

        type:
          ChannelType.GuildText,

        parent:
          category.id,

        topic:
          JSON.stringify({
            ownerId:
              interaction.user.id,

            type,

            claimedBy:
              null,

            createdAt:
              Date.now()
          }),

        permissionOverwrites: [
          {
            id:
              guild.roles.everyone.id,

            deny: [
              PermissionFlagsBits.ViewChannel
            ]
          },

          {
            id:
              interaction.user.id,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          },

          ...validStaffRoles.map(
            (roleId) => ({
              id: roleId,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
              ]
            })
          )
        ]
      });
  } catch (error) {
    console.error(
      "=================================="
    );

    console.error(
      "❌ CREATE TICKET ERROR"
    );

    console.error(
      "Guild:",
      guild.id,
      guild.name
    );

    console.error(
      "User:",
      interaction.user.id,
      interaction.user.tag
    );

    console.error(
      "Category:",
      category.id,
      category.name
    );

    console.error(
      "Error:",
      error
    );

    console.error(
      "=================================="
    );

    return interaction.reply({
      content:
        "❌ لم أستطع إنشاء التذكرة.\n\n" +
        "تأكد أن البوت لديه **Manage Channels** وأن Category التذاكر صحيحة.",
      ephemeral: true
    });
  }

  if (!channel) {
    return interaction.reply({
      content:
        "❌ فشل إنشاء التذكرة.",
      ephemeral: true
    });
  }

  db.tickets[channel.id] = {
    ownerId:
      interaction.user.id,

    type,

    claimedBy: null,

    createdAt:
      Date.now()
  };

  saveDB();

  const embed =
    new EmbedBuilder()
      .setTitle(
        "🎫 تم فتح التذكرة"
      )
      .setDescription(
        `${interaction.user}\n\n` +
        `**نوع التذكرة:** ${
          TICKET_TYPES[type] ||
          type
        }\n\n` +
        "يرجى كتابة المشكلة بالتفصيل.\n" +
        "سيقوم أحد أعضاء الإدارة باستلام التذكرة.\n\n" +
        `**${CONFIG.SERVER_NAME}**`
      )
      .setColor(0x57f287)
      .setFooter({
        text:
          `${CONFIG.SERVER_NAME} • Tickets`
      })
      .setTimestamp();

  const row =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "ticket_claim"
          )
          .setLabel("استلام")
          .setEmoji("📥")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket_close"
          )
          .setLabel("إغلاق")
          .setEmoji("🔒")
          .setStyle(
            ButtonStyle.Danger
          )
      );

  try {
    await channel.send({
      content:
        `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error(
      "❌ SEND TICKET MESSAGE ERROR:",
      error
    );
  }

  await sendTicketLog(
    `🎫 **تم فتح تذكرة**\n` +
    `العضو: <@${interaction.user.id}>\n` +
    `النوع: ${
      TICKET_TYPES[type] ||
      type
    }\n` +
    `التذكرة: ${channel}\n` +
    `السيرفر: **${CONFIG.SERVER_NAME}**`
  );

  return interaction.reply({
    content:
      `✅ تم فتح التذكرة بنجاح: ${channel}`,
    ephemeral: true
  });
}

/* =========================================================
   CLAIM TICKET
   ========================================================= */

async function claimTicket(
  interaction
) {
  if (
    !isTicketStaff(
      interaction.member
    )
  ) {
    return interaction.reply({
      content:
        "❌ استلام التذكرة للإداريين فقط.",
      ephemeral: true
    });
  }

  const channel =
    interaction.channel;

  let data;

  try {
    data =
      JSON.parse(
        channel.topic
      );
  } catch {
    return interaction.reply({
      content:
        "❌ بيانات التذكرة غير صحيحة.",
      ephemeral: true
    });
  }

  if (data.claimedBy) {
    return interaction.reply({
      content:
        `⚠️ التذكرة مستلمة بالفعل بواسطة <@${data.claimedBy}>.`,
      ephemeral: true
    });
  }

  data.claimedBy =
    interaction.user.id;

  await channel
    .setTopic(
      JSON.stringify(data)
    )
    .catch(() => {});

  if (db.tickets[channel.id]) {
    db.tickets[
      channel.id
    ].claimedBy =
      interaction.user.id;
  }

  const attendance =
    getAttendance(
      interaction.user.id
    );

  attendance.ticketsClaimed +=
    1;

  attendance.points += 1;

  saveDB();

  await interaction.reply(
    `📥 **تم استلام التذكرة بواسطة ${interaction.user}.**`
  );

  await sendTicketLog(
    `📥 **تم استلام تذكرة**\n` +
    `التذكرة: ${channel}\n` +
    `بواسطة: ${interaction.user}`
  );
}

/* =========================================================
   CLOSE TICKET
   ========================================================= */

async function closeTicket(
  interaction
) {
  const channel =
    interaction.channel;

  let data;

  try {
    data =
      JSON.parse(
        channel.topic
      );
  } catch {
    return interaction.reply({
      content:
        "❌ هذه ليست تذكرة صحيحة.",
      ephemeral: true
    });
  }

  const isOwner =
    data.ownerId ===
    interaction.user.id;

  const staff =
    isTicketStaff(
      interaction.member
    );

  if (!isOwner && !staff) {
    return interaction.reply({
      content:
        "❌ ليس لديك صلاحية إغلاق التذكرة.",
      ephemeral: true
    });
  }

  await interaction.reply(
    `🔒 **تم إغلاق التذكرة بواسطة ${interaction.user}.**`
  );

  if (data.claimedBy) {
    const attendance =
      getAttendance(
        data.claimedBy
      );

    attendance.ticketsClosed +=
      1;

    attendance.points +=
      1;

    saveDB();
  }

  const owner =
    await client.users
      .fetch(data.ownerId)
      .catch(() => null);

  if (owner) {
    await owner.send(
      `🔒 **تم إغلاق التذكرة الخاصة بك في ${CONFIG.SERVER_NAME}.**\n\n` +
      `النوع: ${
        TICKET_TYPES[data.type] ||
        data.type
      }\n` +
      `تم الإغلاق بواسطة: ${interaction.user.tag}`
    ).catch(() => {});
  }

  await sendTicketLog(
    `🔒 **تم إغلاق تذكرة**\n` +
    `العضو: <@${data.ownerId}>\n` +
    `النوع: ${
      TICKET_TYPES[data.type] ||
      data.type
    }\n` +
    `المستلم: ${
      data.claimedBy
        ? `<@${data.claimedBy}>`
        : "لم يتم الاستلام"
    }\n` +
    `أغلقها: ${interaction.user}`
  );

  delete db.tickets[
    channel.id
  ];

  saveDB();

  setTimeout(() => {
    channel.delete(
      "Ticket closed"
    ).catch(() => {});
  }, 3000);
}

/* =========================================================
   PERMIT SYSTEM
   ========================================================= */

async function setupPermitPanels() {
  const list = [
    {
      id:
        CONFIG.PERMIT_ACCEPT_CHANNEL_ID,

      title:
        "✅ قبول تصريح الدخول",

      description:
        "اكتب Discord ID فقط للعضو.\n\n" +
        "مثال:\n" +
        "`123456789012345678`"
    },

    {
      id:
        CONFIG.PERMIT_REJECT_CHANNEL_ID,

      title:
        "❌ رفض تصريح الدخول",

      description:
        "اكتب:\n" +
        "`USER_ID | سبب الرفض`\n\n" +
        "مثال:\n" +
        "`123456789012345678 | سبب الرفض`"
    },

    {
      id:
        CONFIG.PERMIT_PENDING_CHANNEL_ID,

      title:
        "⏳ تصريح الدخول - قيد المراجعة",

      description:
        "اكتب Discord ID فقط.\n\n" +
        "سيصل العضو DM بأن طلبه قيد المراجعة."
    }
  ];

  for (
    const item of list
  ) {
    const channel =
      await getChannel(item.id);

    if (
      !channel?.isTextBased()
    ) {
      continue;
    }

    const embed =
      new EmbedBuilder()
        .setTitle(item.title)
        .setDescription(
          item.description
        )
        .setColor(0x5865f2);

    const messages =
      await channel.messages
        .fetch({ limit: 30 })
        .catch(() => null);

    const old =
      messages?.find(
        (msg) =>
          msg.author.id ===
            client.user.id &&
          msg.embeds[0]?.title ===
            item.title
      );

    if (old) {
      await old.edit({
        embeds: [embed]
      });
    } else {
      await channel.send({
        embeds: [embed]
      });
    }
  }
}

async function handlePermitMessage(
  message
) {
  if (message.author.bot) {
    return;
  }

  if (!message.guild) {
    return;
  }

  let mode = null;

  if (
    message.channel.id ===
    CONFIG.PERMIT_ACCEPT_CHANNEL_ID
  ) {
    mode = "accept";
  }

  if (
    message.channel.id ===
    CONFIG.PERMIT_REJECT_CHANNEL_ID
  ) {
    mode = "reject";
  }

  if (
    message.channel.id ===
    CONFIG.PERMIT_PENDING_CHANNEL_ID
  ) {
    mode = "pending";
  }

  if (!mode) {
    return;
  }

  if (
    !isAdmin(message.member) &&
    !isTicketStaff(message.member)
  ) {
    return message.reply(
      "❌ هذا النظام للإدارة فقط."
    );
  }

  const content =
    message.content.trim();

  // ACCEPT
  if (mode === "accept") {
    if (
      !/^\d{15,25}$/.test(
        content
      )
    ) {
      return message.reply(
        "❌ اكتب Discord ID فقط."
      );
    }

    const member =
      await message.guild.members
        .fetch(content)
        .catch(() => null);

    if (!member) {
      return message.reply(
        "❌ العضو غير موجود في السيرفر."
      );
    }

    const role =
      message.guild.roles.cache.get(
        CONFIG.PERMIT_ROLE_ID
      );

    if (!role) {
      return message.reply(
        "❌ رول تصريح الدخول غير موجود."
      );
    }

    try {
      await member.roles.add(
        role
      );
    } catch {
      return message.reply(
        "❌ لم أستطع إعطاء الرول. تأكد أن رول البوت أعلى من الرول."
      );
    }

    await message.reply(
      `✅ تم قبول <@${content}> وإعطاؤه رول تصريح الدخول في **مدينة ${CONFIG.SERVER_NAME}**.`
    );

    await member.send(
      `✅ **تم قبولك في مدينة ${CONFIG.SERVER_NAME}.**`
    ).catch(() => {});

    return;
  }

  // PENDING
  if (mode === "pending") {
    if (
      !/^\d{15,25}$/.test(
        content
      )
    ) {
      return message.reply(
        "❌ اكتب Discord ID فقط."
      );
    }

    const user =
      await client.users
        .fetch(content)
        .catch(() => null);

    if (!user) {
      return message.reply(
        "❌ لم أجد العضو."
      );
    }

    await user.send(
      `⏳ **طلبك قيد المراجعة في مدينة ${CONFIG.SERVER_NAME}.**\n\n` +
      `الإدارة تقوم حاليًا بمراجعة طلب دخولك إلى مدينة ${CONFIG.SERVER_NAME}.`
    ).catch(() => {});

    return message.reply(
      `⏳ تم إرسال حالة قيد المراجعة إلى <@${content}>.`
    );
  }

  // REJECT
  if (mode === "reject") {
    const parts =
      content.split("|");

    const userId =
      parts[0]?.trim();

    const reason =
      parts
        .slice(1)
        .join("|")
        .trim() ||
      "لم يتم تحديد سبب.";

    if (
      !/^\d{15,25}$/.test(
        userId
      )
    ) {
      return message.reply(
        "❌ استخدم:\n`USER_ID | سبب الرفض`"
      );
    }

    const user =
      await client.users
        .fetch(userId)
        .catch(() => null);

    if (!user) {
      return message.reply(
        "❌ لم أجد العضو."
      );
    }

    await user.send(
      `❌ **تم رفضك من مدينة ${CONFIG.SERVER_NAME}.**\n\n` +
      `**سبب الرفض:**\n${reason}`
    ).catch(() => {});

    return message.reply(
      `❌ تم رفض طلب <@${userId}> وإرسال السبب له.`
    );
  }
}

/* =========================================================
   INTERACTIONS
   ========================================================= */

client.on(
  "interactionCreate",
  async (interaction) => {
    try {
      // Application start
      if (
        interaction.isButton() &&
        interaction.customId ===
          "start_staff_application"
      ) {
        return startApplication(
          interaction
        );
      }

      // Application accept
      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "app_accept_"
        )
      ) {
        const userId =
          interaction.customId.replace(
            "app_accept_",
            ""
          );

        return acceptApplication(
          interaction,
          userId
        );
      }

      // Application pending
      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "app_pending_"
        )
      ) {
        const userId =
          interaction.customId.replace(
            "app_pending_",
            ""
          );

        return pendingApplication(
          interaction,
          userId
        );
      }

      // Application reject
      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "app_reject_"
        )
      ) {
        const userId =
          interaction.customId.replace(
            "app_reject_",
            ""
          );

        return rejectApplicationModal(
          interaction,
          userId
        );
      }

      // Reject modal
      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "reject_reason_"
        )
      ) {
        if (
          !isAdmin(
            interaction.member
          ) &&
          !isTicketStaff(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              "❌ ليس لديك صلاحية.",
            ephemeral: true
          });
        }

        const userId =
          interaction.customId.replace(
            "reject_reason_",
            ""
          );

        return finishRejectApplication(
          interaction,
          userId
        );
      }

      // Attendance
      if (
        interaction.isButton() &&
        interaction.customId ===
          "attendance_in"
      ) {
        return attendanceIn(
          interaction
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          "attendance_out"
      ) {
        return attendanceOut(
          interaction
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          "attendance_stats"
      ) {
        return attendanceStats(
          interaction
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          "attendance_top"
      ) {
        return attendanceTop(
          interaction
        );
      }

      // Ticket select
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "ticket_select"
      ) {
        return createTicket(
          interaction,
          interaction.values[0]
        );
      }

      // Ticket claim
      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_claim"
      ) {
        return claimTicket(
          interaction
        );
      }

      // Ticket close
      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close"
      ) {
        return closeTicket(
          interaction
        );
      }
    } catch (error) {
      console.error(
        "INTERACTION ERROR:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction
          .reply({
            content:
              "❌ حدث خطأ غير متوقع.",
            ephemeral: true
          })
          .catch(() => {});
      }
    }
  }
);

/* =========================================================
   MESSAGE CREATE
   ========================================================= */

client.on(
  "messageCreate",
  async (message) => {
    try {
      await handlePermitMessage(
        message
      );
    } catch (error) {
      console.error(
        "MESSAGE ERROR:",
        error
      );
    }
  }
);

/* =========================================================
   READY
   ========================================================= */

client.once(
  "ready",
  async () => {
    console.log(
      "=================================="
    );

    console.log(
      `✅ Logged in as ${client.user.tag}`
    );

    console.log(
      `✅ Server: ${CONFIG.SERVER_NAME}`
    );

    console.log(
      "=================================="
    );

    client.user.setPresence({
      status: "online",

      activities: [
        {
          name:
            `${CONFIG.SERVER_NAME} | Support`
        }
      ]
    });

    await setupApplicationPanel();
    await setupAttendancePanel();
    await setupTicketPanel();
    await setupPermitPanels();

    console.log(
      "✅ All systems loaded."
    );
  }
);

/* =========================================================
   AUTO REFRESH ATTENDANCE PANEL
   ========================================================= */

setInterval(
  async () => {
    await setupAttendancePanel()
      .catch(() => {});
  },
  60000
);

/* =========================================================
   ERRORS
   ========================================================= */

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "UNHANDLED REJECTION:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);

/* =========================================================
   LOGIN
   ========================================================= */

if (
  !process.env.DISCORD_TOKEN
) {
  console.error(
    "❌ DISCORD_TOKEN is missing from Railway Variables."
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);

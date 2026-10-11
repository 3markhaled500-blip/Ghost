
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ==========================================
// BARAKAT COMMUNITY - Discord Bot
// ==========================================

const CONFIG = {
  SERVER_NAME: "BARAKAT COMMUNITY",
  TIMEZONE: "Africa/Cairo",

  WELCOME_CHANNEL_ID: "1525643339699847178",
  AUTO_ROLE_ID: "1532611461245964389",

  APPLICATION_PANEL_CHANNEL_ID: "1550783900261818468",
  APPLICATION_CATEGORY_ID: "1550783950060789880",
  ACCEPTED_ROLE_ID: "1550780555753299968",
  APPLICATION_LOG_CHANNEL_ID: "1556953724608446496",

  TICKET_PANEL_CHANNEL_ID: "1553140280742510622",
  TICKET_CATEGORY_ID: "1553139841007620267",
  TICKET_STAFF_ROLE_ID: "1556821008927948810",
  TICKET_LOG_CHANNEL_ID: "1556953848512516137",

  MEMBER_LOG_CHANNEL_ID: "1556835811440459796",
  SERVER_LOG_CHANNEL_ID: "1556835920760803428",
  VOICE_LOG_CHANNEL_ID: "1556835946132013150",
  ADMIN_LOG_CHANNEL_ID: "1556837526445101056",
};

const TOKEN = process.env.DISCORD_TOKEN;
const WELCOME_BANNER_URL = process.env.WELCOME_BANNER_URL || "";

if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN in Railway Variables.");
  process.exit(1);
}

const DB_PATH = path.join(__dirname, "database.json");

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (error) {
    console.error("Database read error:", error);
  }

  return {
    applications: {},
    tickets: {},
  };
}

const db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Database write error:", error);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

const COLORS = {
  primary: 0x7c3aed,
  success: 0x2ecc71,
  danger: 0xe74c3c,
  warning: 0xf1c40f,
  neutral: 0x5865f2,
};

function makeEmbed(title, description, color = COLORS.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: CONFIG.SERVER_NAME })
    .setTimestamp();
}

function getChannel(guild, id) {
  return guild.channels.cache.get(id);
}

async function sendLog(guild, channelId, embed) {
  const channel = getChannel(guild, channelId);
  if (!channel || !channel.isTextBased()) return;

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Log send error:", error.message);
  }
}

function safeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 18) || "member";
}

function ticketTypeName(type) {
  const names = {
    support: "الدعم الفني",
    editor: "التقديم على إديتور",
    complaint: "الشكاوى",
    stream: "طلبات الستريم",
    other: "طلب آخر",
  };

  return names[type] || "تذكرة";
}

function makeTicketPanel() {
  const embed = makeEmbed(
    "🎫 نظام التذاكر | BARAKAT COMMUNITY",
    [
      "أهلًا بك في نظام التذاكر الرسمي.",
      "",
      "اختر نوع التذكرة من القائمة:",
      "🎧 الدعم الفني",
      "🎬 التقديم على إديتور",
      "📢 طلبات الستريم",
      "⚠️ الشكاوى",
      "📩 طلب آخر",
      "",
      "يرجى عدم فتح تذاكر مكررة، وانتظار رد الإدارة.",
    ].join("\n")
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_create")
    .setPlaceholder("اختر نوع التذكرة")
    .addOptions(
      {
        label: "الدعم الفني",
        description: "مشكلة أو استفسار يحتاج إلى مساعدة",
        value: "support",
        emoji: "🎧",
      },
      {
        label: "التقديم على إديتور",
        description: "التقديم للانضمام إلى فريق الإديتور",
        value: "editor",
        emoji: "🎬",
      },
      {
        label: "طلبات الستريم",
        description: "مساعدة أو طلب متعلق بالبث",
        value: "stream",
        emoji: "📢",
      },
      {
        label: "الشكاوى",
        description: "تقديم شكوى للإدارة",
        value: "complaint",
        emoji: "⚠️",
      },
      {
        label: "طلب آخر",
        description: "أي طلب آخر متعلق بالكوميونيتي",
        value: "other",
        emoji: "📩",
      }
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

function makeApplicationPanel() {
  const embed = makeEmbed(
    "🎥 التقديم على مودي ستريم",
    [
      "تريد الانضمام إلى فريق مودي ستريم في BARAKAT COMMUNITY؟",
      "",
      "اضغط على زر التقديم بالأسفل.",
      "سيتم إرسال أسئلة التقديم إليك في الخاص (DM).",
      "",
      "يرجى الإجابة بوضوح وبكل مصداقية.",
      "إرسال الطلب لا يعني القبول النهائي.",
    ].join("\n")
  );

  const button = new ButtonBuilder()
    .setCustomId("stream_apply")
    .setLabel("تقديم مودي ستريم")
    .setEmoji("🎥")
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(button),
    ],
  };
}

const APPLICATION_QUESTIONS = [
  "ما اسمك وعمرك؟",
  "ما اسمك داخل الكوميونيتي؟",
  "ما اسم حسابك على منصة البث؟ أرسل الرابط إن وجد.",
  "ما خبرتك السابقة في إدارة البثوث؟",
  "لماذا تريد الانضمام إلى فريق مودي ستريم؟",
  "كم ساعة تستطيع التواجد يوميًا؟",
  "هل لديك خبرة في التعامل مع المخالفات والمشاكل أثناء البث؟ وضّح.",
];

function makeApplicationReview(application) {
  const answers = APPLICATION_QUESTIONS.map((question, index) => {
    const answer = application.answers[index] || "لم تتم الإجابة";
    return `**${index + 1}. ${question}**\n${answer.slice(0, 900)}`;
  });

  const embed = makeEmbed(
    "📋 طلب تقديم مودي ستريم",
    [
      `**المتقدم:** <@${application.userId}>`,
      `**الحالة:** قيد المراجعة`,
      "",
      ...answers,
    ].join("\n\n"),
    COLORS.warning
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`app_accept:${application.id}`)
      .setLabel("قبول مبدئي")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`app_reject:${application.id}`)
      .setLabel("رفض")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`app_pending:${application.id}`)
      .setLabel("قيد المراجعة")
      .setEmoji("⏳")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function startApplication(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const existing = Object.values(db.applications).find(
    (app) =>
      app.userId === interaction.user.id &&
      app.status === "pending"
  );

  if (existing) {
    return interaction.editReply(
      "لديك تقديم قيد المراجعة بالفعل. يرجى انتظار رد الإدارة."
    );
  }

  let dm;

  try {
    dm = await interaction.user.createDM();
    await dm.send({
      embeds: [
        makeEmbed(
          "🎥 تقديم مودي ستريم | BARAKAT COMMUNITY",
          "سنبدأ الآن أسئلة التقديم. أجب عن كل سؤال برسالة منفصلة.\nاكتب `إلغاء` لإيقاف التقديم."
        ),
      ],
    });
  } catch {
    return interaction.editReply(
      "تعذر إرسال رسالة خاصة إليك. افتح الرسائل الخاصة من السيرفر، ثم جرّب مرة أخرى."
    );
  }

  await interaction.editReply(
    "تم إرسال أسئلة التقديم إلى الخاص DM. أكمل إجاباتك هناك."
  );

  const answers = [];

  try {
    for (let i = 0; i < APPLICATION_QUESTIONS.length; i++) {
      await dm.send({
        embeds: [
          makeEmbed(
            `السؤال ${i + 1} من ${APPLICATION_QUESTIONS.length}`,
            APPLICATION_QUESTIONS[i]
          ),
        ],
      });

      const collected = await dm.awaitMessages({
        filter: (message) =>
          message.author.id === interaction.user.id &&
          !message.author.bot,
        max: 1,
        time: 5 * 60 * 1000,
        errors: ["time"],
      });

      const answer = collected.first().content.trim();

      if (answer.toLowerCase() === "إلغاء" || answer.toLowerCase() === "cancel") {
        await dm.send("تم إلغاء التقديم.");
        return;
      }

      if (!answer) {
        await dm.send("الإجابة فارغة. أعد التقديم وحاول مرة أخرى.");
        return;
      }

      answers.push(answer.slice(0, 1500));
    }
  } catch {
    try {
      await dm.send(
        "انتهى وقت التقديم أو تعذر استقبال إجابتك. اضغط زر التقديم مرة أخرى للبدء من جديد."
      );
    } catch {}
    return;
  }

  const applicationId = `${interaction.user.id}-${Date.now()}`;

  const application = {
    id: applicationId,
    userId: interaction.user.id,
    username: interaction.user.username,
    answers,
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewedBy: null,
  };

  db.applications[applicationId] = application;
  saveDB();

  const guild = interaction.guild;
  const category = getChannel(guild, CONFIG.APPLICATION_CATEGORY_ID);

  let reviewChannel = null;

  try {
    if (category && category.type === ChannelType.GuildCategory) {
      reviewChannel = await guild.channels.create({
        name: `تقديم-${safeName(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `Stream moderator application | User ID: ${interaction.user.id}`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
            ],
            deny: [PermissionFlagsBits.SendMessages],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });
    }
  } catch (error) {
    console.error("Could not create application review channel:", error);
  }

  const reviewDestination =
    reviewChannel ||
    getChannel(guild, CONFIG.APPLICATION_LOG_CHANNEL_ID);

  if (reviewDestination && reviewDestination.isTextBased()) {
    try {
      const message = await reviewDestination.send(
        makeApplicationReview(application)
      );

      application.reviewChannelId = reviewDestination.id;
      application.reviewMessageId = message.id;
      saveDB();
    } catch (error) {
      console.error("Application review send error:", error);
    }
  }

  try {
    await dm.send(
      "✅ تم استلام تقديمك بنجاح وإرساله إلى الإدارة للمراجعة. سنراسلك عند اتخاذ القرار."
    );
  } catch {}

  await sendLog(
    guild,
    CONFIG.APPLICATION_LOG_CHANNEL_ID,
    makeEmbed(
      "📥 تم استلام تقديم جديد",
      `المتقدم: <@${interaction.user.id}>\nرقم الطلب: \`${applicationId}\`\nالحالة: قيد المراجعة`
    )
  );
}

async function createTicket(interaction, type) {
  await interaction.deferReply({ ephemeral: true });

  const existing = Object.values(db.tickets).find(
    (ticket) =>
      ticket.userId === interaction.user.id &&
      ticket.status === "open"
  );

  if (existing) {
    return interaction.editReply(
      `لديك تذكرة مفتوحة بالفعل: <#${existing.channelId}>`
    );
  }

  const guild = interaction.guild;
  const category = getChannel(guild, CONFIG.TICKET_CATEGORY_ID);

  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.editReply(
      "تعذر العثور على كاتيجوري التذاكر. تأكد من الـ ID وأنه Category."
    );
  }

  const channelName =
    `${type}-${safeName(interaction.user.username)}`.slice(0, 90);

  let ticketChannel;

  try {
    ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `Ticket type: ${type} | Owner ID: ${interaction.user.id}`,
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
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: CONFIG.TICKET_STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Ticket creation error:", error);
    return interaction.editReply(
      "لم أستطع إنشاء التذكرة. تأكد من صلاحيات البوت وترتيب الرولات."
    );
  }

  const ticketId = `${ticketChannel.id}`;

  db.tickets[ticketId] = {
    id: ticketId,
    channelId: ticketChannel.id,
    userId: interaction.user.id,
    type,
    status: "open",
    claimedBy: null,
    createdAt: new Date().toISOString(),
  };
  saveDB();

  const embed = makeEmbed(
    `🎫 تذكرة ${ticketTypeName(type)}`,
    [
      `أهلًا <@${interaction.user.id}>.`,
      `**نوع الطلب:** ${ticketTypeName(type)}`,
      "",
      "اكتب تفاصيل طلبك بوضوح، وسيرد عليك فريق الإدارة عند توفره.",
      "يرجى عدم مشاركة كلمات المرور أو البيانات السرية.",
    ].join("\n")
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_claim:${ticketId}`)
      .setLabel("استلام التذكرة")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ticket_close:${ticketId}`)
      .setLabel("إغلاق التذكرة")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content: `<@${interaction.user.id}> <@&${CONFIG.TICKET_STAFF_ROLE_ID}>`,
    embeds: [embed],
    components: [row],
    allowedMentions: {
      users: [interaction.user.id],
      roles: [CONFIG.TICKET_STAFF_ROLE_ID],
    },
  });

  await interaction.editReply(
    `تم فتح تذكرتك: ${ticketChannel}`
  );

  await sendLog(
    guild,
    CONFIG.TICKET_LOG_CHANNEL_ID,
    makeEmbed(
      "🎫 تم فتح تذكرة",
      `العضو: <@${interaction.user.id}>\nالنوع: ${ticketTypeName(type)}\nالروم: ${ticketChannel}`
    )
  );
}

function isTicketStaff(member) {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.roles.cache.has(CONFIG.TICKET_STAFF_ROLE_ID)
  );
}

async function closeTicket(interaction, ticket) {
  const staff = isTicketStaff(interaction.member);
  const owner = interaction.user.id === ticket.userId;

  if (!staff && !owner) {
    return interaction.reply({
      content: "لا يمكنك إغلاق هذه التذكرة.",
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: "🔒 سيتم إغلاق التذكرة وحفظ سجل الرسائل.",
    ephemeral: true,
  });

  const channel = interaction.channel;
  let transcript = `BARAKAT COMMUNITY - Ticket Transcript\n`;
  transcript += `Ticket: ${channel.name}\n`;
  transcript += `Owner ID: ${ticket.userId}\n`;
  transcript += `Type: ${ticket.type}\n`;
  transcript += `Closed by: ${interaction.user.tag}\n\n`;

  try {
    let lastId;

    for (let page = 0; page < 10; page++) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);
      if (!messages.size) break;

      const sorted = [...messages.values()].sort(
        (a, b) => a.createdTimestamp - b.createdTimestamp
      );

      for (const message of sorted) {
        const content = message.content || "[بدون نص]";
        const attachments = [...message.attachments.values()]
          .map((a) => a.url)
          .join(" ");

        transcript +=
          `[${new Date(message.createdTimestamp).toISOString()}] ` +
          `${message.author?.tag || "Unknown"}: ${content} ${attachments}\n`;
      }

      lastId = messages.last().id;
      if (messages.size < 100) break;
    }
  } catch (error) {
    transcript += `\nTranscript collection error: ${error.message}\n`;
  }

  const logChannel = getChannel(
    interaction.guild,
    CONFIG.TICKET_LOG_CHANNEL_ID
  );

  if (logChannel && logChannel.isTextBased()) {
    try {
      await logChannel.send({
        embeds: [
          makeEmbed(
            "🔒 تم إغلاق تذكرة",
            `الروم: #${channel.name}\nصاحب التذكرة: <@${ticket.userId}>\nأغلقها: <@${interaction.user.id}>\nالنوع: ${ticketTypeName(ticket.type)}`
          ),
        ],
        files: [
          {
            attachment: Buffer.from(transcript, "utf8"),
            name: `transcript-${ticket.id}.txt`,
          },
        ],
      });
    } catch (error) {
      console.error("Transcript log error:", error);
    }
  }

  ticket.status = "closed";
  ticket.closedAt = new Date().toISOString();
  ticket.closedBy = interaction.user.id;
  saveDB();

  setTimeout(async () => {
    try {
      await channel.delete("Ticket closed");
    } catch (error) {
      console.error("Ticket deletion error:", error);
    }
  }, 5000);
}

const commands = [
  new SlashCommandBuilder()
    .setName("setup-panels")
    .setDescription("إنشاء لوحات التقديم والتذاكر")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((command) => command.toJSON());

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`${CONFIG.SERVER_NAME} bot is online.`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("Slash commands registered.");
  } catch (error) {
    console.error("Slash command registration error:", error);
  }
});

// ==========================================
// Welcome and member logs
// ==========================================

client.on("guildMemberAdd", async (member) => {
  try {
    const role = member.guild.roles.cache.get(CONFIG.AUTO_ROLE_ID);
    if (role) await member.roles.add(role, "Automatic member role");
  } catch (error) {
    console.error("Auto-role error:", error);
  }

  const embed = makeEmbed(
    `أهلًا بك في ${CONFIG.SERVER_NAME} 💜`,
    [
      `نورت السيرفر يا <@${member.id}>!`,
      "",
      `أنت العضو رقم **${member.guild.memberCount}**.`,
      "نتمنى لك وقتًا ممتعًا معنا.",
      "",
      "يرجى قراءة القوانين والالتزام بها.",
    ].join("\n")
  ).setThumbnail(member.user.displayAvatarURL({ size: 256 }));

  if (WELCOME_BANNER_URL) {
    embed.setImage(WELCOME_BANNER_URL);
  }

  const welcomeChannel = getChannel(
    member.guild,
    CONFIG.WELCOME_CHANNEL_ID
  );

  if (welcomeChannel && welcomeChannel.isTextBased()) {
    await welcomeChannel.send({ embeds: [embed] }).catch(console.error);
  }

  await sendLog(
    member.guild,
    CONFIG.MEMBER_LOG_CHANNEL_ID,
    makeEmbed(
      "📥 عضو جديد",
      `العضو: ${member.user.tag}\nالمعرف: \`${member.id}\`\nعدد الأعضاء: ${member.guild.memberCount}`
    )
  );
});

client.on("guildMemberRemove", async (member) => {
  await sendLog(
    member.guild,
    CONFIG.MEMBER_LOG_CHANNEL_ID,
    makeEmbed(
      "📤 مغادرة عضو",
      `العضو: ${member.user.tag}\nالمعرف: \`${member.id}\``,
      COLORS.danger
    )
  );
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());

  const added = [...newRoles].filter((id) => !oldRoles.has(id));
  const removed = [...oldRoles].filter((id) => !newRoles.has(id));

  if (!added.length && !removed.length) return;

  const lines = [];

  for (const id of added) lines.push(`➕ <@&${id}>`);
  for (const id of removed) lines.push(`➖ <@&${id}>`);

  await sendLog(
    newMember.guild,
    CONFIG.ADMIN_LOG_CHANNEL_ID,
    makeEmbed(
      "🛡️ تغيير رولات عضو",
      `العضو: <@${newMember.id}>\n${lines.join("\n")}`
    )
  );
});

client.on("guildUpdate", async (oldGuild, newGuild) => {
  const changes = [];

  if (oldGuild.name !== newGuild.name) {
    changes.push(`الاسم: ${oldGuild.name} → ${newGuild.name}`);
  }

  if (oldGuild.icon !== newGuild.icon) {
    changes.push("تم تغيير أيقونة السيرفر.");
  }

  if (!changes.length) return;

  await sendLog(
    newGuild,
    CONFIG.SERVER_LOG_CHANNEL_ID,
    makeEmbed("⚙️ تعديل إعدادات السيرفر", changes.join("\n"))
  );
});

client.on("messageDelete", async (message) => {
  if (!message.guild || message.author?.bot) return;

  await sendLog(
    message.guild,
    CONFIG.ADMIN_LOG_CHANNEL_ID,
    makeEmbed(
      "🗑️ رسالة محذوفة",
      `العضو: ${message.author || "غير معروف"}\nالروم: ${message.channel}\nالمحتوى:\n${(message.content || "[لا يوجد نص]").slice(0, 1500)}`,
      COLORS.danger
    )
  );
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  await sendLog(
    newMessage.guild,
    CONFIG.ADMIN_LOG_CHANNEL_ID,
    makeEmbed(
      "✏️ تعديل رسالة",
      `العضو: ${newMessage.author}\nالروم: ${newMessage.channel}\nقبل:\n${(oldMessage.content || "[غير متاح]").slice(0, 700)}\n\nبعد:\n${(newMessage.content || "[لا يوجد نص]").slice(0, 700)}`
    )
  );
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  let description = "";

  if (!oldState.channelId && newState.channelId) {
    description = `دخل الروم الصوتي: <#${newState.channelId}>`;
  } else if (oldState.channelId && !newState.channelId) {
    description = `خرج من الروم الصوتي: <#${oldState.channelId}>`;
  } else if (oldState.channelId !== newState.channelId) {
    description =
      `انتقل من <#${oldState.channelId}> إلى <#${newState.channelId}>`;
  } else if (oldState.serverMute !== newState.serverMute) {
    description = newState.serverMute
      ? "تم كتمه من السيرفر."
      : "تم إلغاء كتمه من السيرفر.";
  } else if (oldState.serverDeaf !== newState.serverDeaf) {
    description = newState.serverDeaf
      ? "تم منعه من سماع الصوت من السيرفر."
      : "تم إلغاء منعه من سماع الصوت.";
  }

  if (!description) return;

  await sendLog(
    member.guild,
    CONFIG.VOICE_LOG_CHANNEL_ID,
    makeEmbed("🔊 سجل صوتي", `العضو: ${member}\n${description}`)
  );
});

// ==========================================
// Interactions
// ==========================================

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-panels") {
        if (!interaction.guild) {
          return interaction.reply({
            content: "استخدم الأمر داخل السيرفر.",
            ephemeral: true,
          });
        }

        const appChannel = getChannel(
          interaction.guild,
          CONFIG.APPLICATION_PANEL_CHANNEL_ID
        );
        const ticketChannel = getChannel(
          interaction.guild,
          CONFIG.TICKET_PANEL_CHANNEL_ID
        );

        if (!appChannel?.isTextBased() || !ticketChannel?.isTextBased()) {
          return interaction.reply({
            content:
              "تعذر العثور على روم لوحة التقديم أو التذاكر. تحقق من الأيديهات.",
            ephemeral: true,
          });
        }

        await appChannel.send(makeApplicationPanel());
        await ticketChannel.send(makeTicketPanel());

        return interaction.reply({
          content: "تم إرسال لوحتي تقديم مودي ستريم والتذاكر بنجاح.",
          ephemeral: true,
        });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "stream_apply") {
        return await startApplication(interaction);
      }

      if (interaction.customId.startsWith("app_")) {
        const [action, applicationId] = interaction.customId.split(":");
        const application = db.applications[applicationId];

        if (!application) {
          return interaction.reply({
            content: "هذا الطلب غير موجود في قاعدة البيانات.",
            ephemeral: true,
          });
        }

        if (
          !interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
          )
        ) {
          return interaction.reply({
            content: "هذا الإجراء مخصص للإدارة.",
            ephemeral: true,
          });
        }

        if (application.status !== "pending") {
          return interaction.reply({
            content: "تمت مراجعة هذا الطلب بالفعل.",
            ephemeral: true,
          });
        }

        if (action === "app_pending") {
          await interaction.reply({
            content: "الطلب ما زال قيد المراجعة.",
            ephemeral: true,
          });

          await sendLog(
            interaction.guild,
            CONFIG.APPLICATION_LOG_CHANNEL_ID,
            makeEmbed(
              "⏳ تقديم قيد المراجعة",
              `المتقدم: <@${application.userId}>\nالمراجع: <@${interaction.user.id}>`
            )
          );
          return;
        }

        if (action === "app_accept") {
          const member = await interaction.guild.members
            .fetch(application.userId)
            .catch(() => null);

          if (member) {
            await member.roles.add(
              CONFIG.ACCEPTED_ROLE_ID,
              "Accepted stream moderator application"
            ).catch(console.error);
          }

          application.status = "accepted";
          application.reviewedBy = interaction.user.id;
          application.reviewedAt = new Date().toISOString();
          saveDB();

          await interaction.update({
            embeds: [
              makeEmbed(
                "✅ تم قبول التقديم مبدئيًا",
                `المتقدم: <@${application.userId}>\nالمراجع: <@${interaction.user.id}>`,
                COLORS.success
              ),
            ],
            components: [],
          });

          const user = await client.users
            .fetch(application.userId)
            .catch(() => null);

          if (user) {
            await user.send(
              `مبروك! تم قبول تقديمك مبدئيًا في ${CONFIG.SERVER_NAME}. يرجى متابعة تعليمات الإدارة.`
            ).catch(() => {});
          }

          await sendLog(
            interaction.guild,
            CONFIG.APPLICATION_LOG_CHANNEL_ID,
            makeEmbed(
              "✅ قبول تقديم مودي ستريم",
              `المتقدم: <@${application.userId}>\nالمراجع: <@${interaction.user.id}>`
            )
          );

          return;
        }

        if (action === "app_reject") {
          application.status = "rejected";
          application.reviewedBy = interaction.user.id;
          application.reviewedAt = new Date().toISOString();
          saveDB();

          await interaction.update({
            embeds: [
              makeEmbed(
                "❌ تم رفض التقديم",
                `المتقدم: <@${application.userId}>\nالمراجع: <@${interaction.user.id}>`,
                COLORS.danger
              ),
            ],
            components: [],
          });

          const user = await client.users
            .fetch(application.userId)
            .catch(() => null);

          if (user) {
            await user.send(
              `نشكرك على التقديم في ${CONFIG.SERVER_NAME}. نعتذر، لم يتم قبول طلبك هذه المرة. يمكنك متابعة إعلانات التقديمات القادمة.`
            ).catch(() => {});
          }

          await sendLog(
            interaction.guild,
            CONFIG.APPLICATION_LOG_CHANNEL_ID,
            makeEmbed(
              "❌ رفض تقديم مودي ستريم",
              `المتقدم: <@${application.userId}>\nالمراجع: <@${interaction.user.id}>`
            )
          );

          return;
        }
      }

      if (interaction.customId.startsWith("ticket_claim:")) {
        const ticketId = interaction.customId.split(":")[1];
        const ticket = db.tickets[ticketId];

        if (!ticket || ticket.status !== "open") {
          return interaction.reply({
            content: "التذكرة غير موجودة أو مغلقة.",
            ephemeral: true,
          });
        }

        if (!isTicketStaff(interaction.member)) {
          return interaction.reply({
            content: "هذا الزر مخصص لطاقم التذاكر.",
            ephemeral: true,
          });
        }

        if (ticket.claimedBy) {
          return interaction.reply({
            content: `تم استلام التذكرة بالفعل بواسطة <@${ticket.claimedBy}>.`,
            ephemeral: true,
          });
        }

        ticket.claimedBy = interaction.user.id;
        saveDB();

        await interaction.reply({
          content: `🛠️ استلم <@${interaction.user.id}> هذه التذكرة.`,
        });

        await sendLog(
          interaction.guild,
          CONFIG.TICKET_LOG_CHANNEL_ID,
          makeEmbed(
            "🛠️ تم استلام تذكرة",
            `التذكرة: ${interaction.channel}\nالموظف: <@${interaction.user.id}>`
          )
        );
        return;
      }

      if (interaction.customId.startsWith("ticket_close:")) {
        const ticketId = interaction.customId.split(":")[1];
        const ticket = db.tickets[ticketId];

        if (!ticket || ticket.status !== "open") {
          return interaction.reply({
            content: "التذكرة غير موجودة أو مغلقة.",
            ephemeral: true,
          });
        }

        return await closeTicket(interaction, ticket);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "ticket_create") {
        return await createTicket(interaction, interaction.values[0]);
      }
    }
  } catch (error) {
    console.error("Interaction error:", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "حدث خطأ أثناء تنفيذ الأمر. تحقق من صلاحيات البوت واللوجات.",
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

client.login(TOKEN);

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

// =========================
// CONFIG
// =========================

const TOKEN = process.env.DISCORD_TOKEN;

// الترحيب
const WELCOME_CHANNEL_ID = "1538611932624453783";

// الرولات التلقائية
const AUTO_ROLE_IDS = [
  "1535767262580047923",
  "1535763946596728902"
];

// روم لوحة التذاكر
const TICKET_PANEL_CHANNEL_ID = "1536034090082369628";

// =========================
// TICKET ROLES
// =========================

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

// =========================
// CLIENT
// =========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.GuildMember,
    Partials.User
  ]
});

// =========================
// READY
// =========================

client.once("ready", async () => {

  console.log(`✅ Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: "Ghost RP",
        type: 3
      }
    ],
    status: "online"
  });

  // إرسال / تحديث لوحة التذاكر
  await setupTicketPanel();
});

// =========================
// MEMBER JOIN
// =========================

client.on("guildMemberAdd", async (member) => {

  try {

    // إعطاء الرولات تلقائيًا
    for (const roleId of AUTO_ROLE_IDS) {

      const role = member.guild.roles.cache.get(roleId);

      if (role) {
        await member.roles.add(role).catch(() => {});
      }
    }

    // روم الترحيب
    const welcomeChannel =
      member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
      .setColor("#1683ff")
      .setTitle("👋 مرحباً بك في Ghost RP")
      .setDescription(
        `أهلاً وسهلاً بك ${member} ❤️\n\n` +
        `نورت سيرفر **Ghost FiveM Roleplay**\n` +
        `نتمنى لك تجربة ممتعة ومميزة معنا.\n\n` +
        `📜 يرجى قراءة القوانين والالتزام بأنظمة السيرفر.\n` +
        `🎫 إذا احتجت أي مساعدة يمكنك فتح تذكرة من قسم الدعم.`
      )
      .setThumbnail(member.user.displayAvatarURL({
        dynamic: true,
        size: 256
      }))
      .setFooter({
        text: "Ghost FiveM Roleplay"
      })
      .setTimestamp();

    // البانر
    const bannerPath = path.join(__dirname, "banner.png");

    if (fs.existsSync(bannerPath)) {

      const banner = new AttachmentBuilder(
        bannerPath,
        { name: "ghost-banner.png" }
      );

      embed.setImage("attachment://ghost-banner.png");

      await welcomeChannel.send({
        content: `👋 نورتنا ${member}!`,
        embeds: [embed],
        files: [banner]
      });

    } else {

      await welcomeChannel.send({
        content: `👋 نورتنا ${member}!`,
        embeds: [embed]
      });

      console.log(
        "⚠️ banner.png غير موجودة، سيتم إرسال الترحيب بدون البانر."
      );
    }

  } catch (error) {

    console.error("❌ Welcome Error:", error);
  }
});

// =========================
// TICKET PANEL
// =========================

async function setupTicketPanel() {

  try {

    const channel =
      await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);

    if (!channel) {
      console.log("❌ لم يتم العثور على روم التذاكر.");
      return;
    }

    const options = Object.entries(TICKET_TYPES).map(
      ([value, ticket]) => {

        return new StringSelectMenuOptionBuilder()
          .setLabel(ticket.name)
          .setDescription(`فتح تذكرة ${ticket.name}`)
          .setValue(value)
          .setEmoji(ticket.emoji);
      }
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("🎫 اختر نوع التذكرة")
      .addOptions(options);

    const row = new ActionRowBuilder()
      .addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor("#1683ff")
      .setTitle("🎫 نظام التذاكر - Ghost RP")
      .setDescription(
        "**مرحباً بك في نظام التذاكر**\n\n" +
        "اختر القسم المناسب لمشكلتك من القائمة بالأسفل.\n\n" +
        "🔒 كل تذكرة تكون **خاصة** بصاحبها والمسؤولين المختصين بالقسم فقط.\n\n" +
        "📢 عند فتح التذكرة سيتم عمل Mention للمسؤولين المختصين تلقائياً.\n\n" +
        "⚠️ يرجى عدم فتح تذكرة بدون سبب."
      )
      .setFooter({
        text: "Ghost FiveM Roleplay • Ticket System"
      })
      .setTimestamp();

    // البحث عن لوحة قديمة للبوت
    const messages = await channel.messages.fetch({
      limit: 50
    });

    const oldPanel = messages.find(
      msg =>
        msg.author.id === client.user.id &&
        msg.components.some(row =>
          row.components.some(
            component => component.customId === "ticket_select"
          )
        )
    );

    if (oldPanel) {

      await oldPanel.edit({
        embeds: [embed],
        components: [row]
      });

      console.log("✅ تم تحديث لوحة التذاكر.");

    } else {

      await channel.send({
        embeds: [embed],
        components: [row]
      });

      console.log("✅ تم إرسال لوحة التذاكر.");
    }

  } catch (error) {

    console.error("❌ Ticket Panel Error:", error);
  }
}

// =========================
// INTERACTIONS
// =========================

client.on("interactionCreate", async (interaction) => {

  // =========================
  // SELECT MENU
  // =========================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "ticket_select"
  ) {

    const type = interaction.values[0];
    const ticket = TICKET_TYPES[type];

    if (!ticket) return;

    await interaction.deferReply({
      ephemeral: true
    });

    const guild = interaction.guild;
    const member = interaction.member;

    // البحث عن تذكرة مفتوحة لنفس العضو
    const existingTicket = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildText &&
        channel.topic === `ticket-owner:${member.id}`
    );

    if (existingTicket) {

      return interaction.editReply({
        content:
          `❌ لديك تذكرة مفتوحة بالفعل:\n${existingTicket}`
      });
    }

    // إنشاء اسم التذكرة
    const safeName =
      ticket.name
        .replace(/[^\u0600-\u06FFa-zA-Z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();

    const channelName =
      `ticket-${safeName}-${member.user.username}`
        .toLowerCase()
        .slice(0, 90);

    // صلاحيات التذكرة
    const permissionOverwrites = [

      // إخفاء عن الجميع
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionsBitField.Flags.ViewChannel
        ]
      },

      // صاحب التذكرة
      {
        id: member.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      },

      // البوت
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ManageMessages
        ]
      }
    ];

    // إضافة المسؤولين
    for (const roleId of ticket.roles) {

      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      });
    }

    // إنشاء التذكرة
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `ticket-owner:${member.id}`,
      permissionOverwrites
    });

    // لو روم لوحة التذاكر داخل Category
    const panelChannel =
      guild.channels.cache.get(TICKET_PANEL_CHANNEL_ID);

    if (
      panelChannel &&
      panelChannel.parentId
    ) {

      await ticketChannel.setParent(
        panelChannel.parentId,
        {
          lockPermissions: false
        }
      ).catch(() => {});
    }

    // زر الإغلاق
    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("إغلاق التذكرة")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
      .addComponents(closeButton);

    // رسالة التذكرة
    const ticketEmbed = new EmbedBuilder()
      .setColor("#1683ff")
      .setTitle(`${ticket.emoji} ${ticket.name}`)
      .setDescription(
        `مرحباً ${member} 👋\n\n` +
        `تم فتح تذكرتك بنجاح.\n` +
        `سيقوم المسؤولون المختصون بمساعدتك في أقرب وقت.\n\n` +
        `📌 **القسم:** ${ticket.name}\n` +
        `👤 **صاحب التذكرة:** ${member}\n\n` +
        `⚠️ يرجى شرح مشكلتك بالتفصيل وعدم عمل Mention للمسؤولين.`
      )
      .setFooter({
        text: "Ghost FiveM Roleplay"
      })
      .setTimestamp();

    // Mentions
    const roleMentions =
      ticket.roles
        .map(roleId => `<@&${roleId}>`)
        .join(" ");

    await ticketChannel.send({
      content:
        `${member}\n${roleMentions}`,
      embeds: [ticketEmbed],
      components: [row]
    });

    await interaction.editReply({
      content:
        `✅ تم فتح تذكرتك بنجاح!\n\n${ticketChannel}`
    });
  }

  // =========================
  // CLOSE TICKET
  // =========================

  if (
    interaction.isButton() &&
    interaction.customId === "close_ticket"
  ) {

    const channel = interaction.channel;

    if (!channel || channel.type !== ChannelType.GuildText) {
      return;
    }

    await interaction.reply({
      content: "🔒 سيتم إغلاق التذكرة خلال 5 ثوانٍ...",
      ephemeral: false
    });

    setTimeout(async () => {

      await channel.delete().catch(() => {});

    }, 5000);
  }
});

// =========================
// ERROR HANDLING
// =========================

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught Exception:", error);
});

// =========================
// LOGIN
// =========================

if (!TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN غير موجود في Railway Variables!"
  );

  process.exit(1);
}

client.login(TOKEN);

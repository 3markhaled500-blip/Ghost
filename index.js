/* =========================================================
   NEW TICKET SYSTEM - FIXED
   ========================================================= */

const TICKET_TYPES = {
  technical: {
    label: "الدعم الفني",
    emoji: "🛠️",
    roles: [
      "1535755003669647410",
      "1535755153838313542"
    ]
  },

  moderation: {
    label: "الرقابة",
    emoji: "🛡️",
    roles: [
      "1535759833427480576",
      "1535759964235104326"
    ]
  },

  development: {
    label: "إبلاغ عن الأخطاء / مشاكل برمجية",
    emoji: "💻",
    roles: [
      "1535762878794305676",
      "1535763358941192252"
    ]
  },

  compensation: {
    label: "التعويضات",
    emoji: "💰",
    roles: [
      "1535757222515310593",
      "1535757299505696938"
    ]
  },

  admin_complaint: {
    label: "شكوى ضد إداري",
    emoji: "⚠️",
    roles: [
      "1535754908261941350",
      "1540288189128904724"
    ]
  },

  store: {
    label: "المتجر",
    emoji: "🛒",
    roles: [
      "1535769580331335680",
      "1535769709029490778"
    ]
  },

  voice: {
    label: "طلب تصريح الصوت",
    emoji: "🎙️",
    roles: [
      "1535759833427480576",
      "1535759964235104326",
      "1535769580331335680"
    ]
  },

  appeal: {
    label: "الاستئناف",
    emoji: "⚖️",
    roles: [
      "1535754908261941350",
      "1535759833427480576",
      "1535759964235104326",
      "1537005018819854368"
    ]
  },

  founders: {
    label: "تواصل مع المؤسسين",
    emoji: "👑",
    roles: [
      "1535754877882474557",
      "1535755333572763798"
    ]
  },

  lspd: {
    label: "انضمام إلى شرطة لوس سانتوس",
    emoji: "🚔",
    roles: [
      "1540263682829975622",
      "1543248863614214256"
    ]
  },

  lsmd: {
    label: "انضمام إلى مستشفى لوس سانتوس",
    emoji: "🏥",
    roles: [
      "1543249300484657336",
      "1542234998252241016"
    ]
  },

  management: {
    label: "الإدارة العليا",
    emoji: "🏛️",
    roles: [
      "1535754908261941350",
      "1540288189128904724"
    ]
  }
};

/* =========================================================
   TICKET HELPERS
   ========================================================= */

function getTicketCategory(guild) {
  const category =
    guild.channels.cache.get(
      CONFIG.TICKET_CATEGORY_ID
    );

  if (
    !category ||
    category.type !== ChannelType.GuildCategory
  ) {
    return null;
  }

  return category;
}

function getBotMember(guild) {
  return (
    guild.members.me ||
    guild.members.cache.get(client.user.id)
  );
}

function getValidTicketRoles(guild, roleIds) {
  return [
    ...new Set(
      roleIds.filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
    )
  ];
}

function getAllTicketRoles() {
  return [
    ...new Set(
      Object.values(TICKET_TYPES)
        .flatMap((ticket) => ticket.roles)
    )
  ];
}

function checkTicketBotPermissions(
  guild,
  category
) {
  const botMember =
    getBotMember(guild);

  if (!botMember) {
    return {
      ok: false,
      message:
        "❌ لم أستطع العثور على البوت داخل السيرفر."
    };
  }

  const permissions =
    category.permissionsFor(
      botMember
    );

  if (!permissions) {
    return {
      ok: false,
      message:
        "❌ لم أستطع قراءة صلاحيات البوت داخل Category التذاكر."
    };
  }

  const required = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageChannels
  ];

  const missing =
    required.filter(
      (permission) =>
        !permissions.has(permission)
    );

  if (missing.length > 0) {
    return {
      ok: false,
      message:
        "❌ البوت ناقصه صلاحيات داخل Category التذاكر.\n\n" +
        "المطلوب:\n" +
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
   FIND USER TICKET
   ========================================================= */

async function findUserTicket(
  guild,
  userId
) {
  const category =
    getTicketCategory(guild);

  if (!category) {
    return null;
  }

  for (
    const channel of category.children.cache.values()
  ) {
    if (
      channel.type !==
      ChannelType.GuildText
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
    } catch {
      continue;
    }
  }

  return null;
}

/* =========================================================
   SETUP TICKET PANEL
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
    getTicketCategory(guild);

  if (!category) {
    console.error(
      `❌ Ticket Category غير موجودة: ${CONFIG.TICKET_CATEGORY_ID}`
    );
    return;
  }

  const permissionCheck =
    checkTicketBotPermissions(
      guild,
      category
    );

  if (!permissionCheck.ok) {
    console.error(
      permissionCheck.message
    );
    return;
  }

  const allTicketRoles =
    getAllTicketRoles();

  const validTicketRoles =
    getValidTicketRoles(
      guild,
      allTicketRoles
    );

  let panel =
    category.children.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.name === "ticket-panel"
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
              id:
                guild.roles.everyone.id,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory
              ],

              deny: [
                PermissionFlagsBits.SendMessages
              ]
            },

            ...validTicketRoles.map(
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

      console.log(
        `✅ Ticket panel created: ${panel.id}`
      );

    } catch (error) {
      console.error(
        "❌ CREATE TICKET PANEL ERROR:",
        error
      );
      return;
    }
  }

  /*
     مهم:
     القيم هنا هي نفسها الموجودة داخل TICKET_TYPES
     ولا يوجد أي value قديم.
  */

  const options = [
    {
      label: "الدعم الفني",
      value: "technical",
      description: "التواصل مع فريق الدعم الفني",
      emoji: "🛠️"
    },

    {
      label: "الرقابة",
      value: "moderation",
      description: "التواصل مع فريق الرقابة",
      emoji: "🛡️"
    },

    {
      label: "الأخطاء والمشاكل البرمجية",
      value: "development",
      description: "إبلاغ عن الأخطاء والمشاكل البرمجية",
      emoji: "💻"
    },

    {
      label: "التعويضات",
      value: "compensation",
      description: "طلبات التعويض",
      emoji: "💰"
    },

    {
      label: "شكوى ضد إداري",
      value: "admin_complaint",
      description: "تقديم شكوى ضد أحد الإداريين",
      emoji: "⚠️"
    },

    {
      label: "المتجر",
      value: "store",
      description: "مشاكل وطلبات المتجر",
      emoji: "🛒"
    },

    {
      label: "طلب تصريح الصوت",
      value: "voice",
      description: "طلبات تصاريح الصوت",
      emoji: "🎙️"
    },

    {
      label: "الاستئناف",
      value: "appeal",
      description: "تقديم طلب استئناف",
      emoji: "⚖️"
    },

    {
      label: "تواصل مع المؤسسين",
      value: "founders",
      description: "التواصل مع المؤسسين",
      emoji: "👑"
    },

    {
      label: "انضمام إلى شرطة لوس سانتوس",
      value: "lspd",
      description: "التقديم على شرطة لوس سانتوس",
      emoji: "🚔"
    },

    {
      label: "انضمام إلى مستشفى لوس سانتوس",
      value: "lsmd",
      description: "التقديم على مستشفى لوس سانتوس",
      emoji: "🏥"
    },

    {
      label: "الإدارة العليا",
      value: "management",
      description: "التواصل مع الإدارة العليا",
      emoji: "🏛️"
    }
  ];

  const embed =
    new EmbedBuilder()
      .setTitle(
        `🎫 نظام تذاكر ${CONFIG.SERVER_NAME}`
      )
      .setDescription(
        "مرحبًا بك في نظام التذاكر.\n\n" +
        "اختر القسم المناسب من القائمة بالأسفل.\n\n" +
        "سيتم فتح تذكرة خاصة بك وإشعار الفريق المختص تلقائيًا.\n\n" +
        "⚠️ يرجى اختيار القسم الصحيح وعدم فتح تذاكر بدون سبب."
      )
      .setColor(0x5865f2)
      .setFooter({
        text:
          `${CONFIG.SERVER_NAME} • Ticket System`
      })
      .setTimestamp();

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "ticket_select_v2"
      )
      .setPlaceholder(
        "🎫 اختر نوع التذكرة"
      )
      .addOptions(
        options
      );

  const row =
    new ActionRowBuilder()
      .addComponents(
        menu
      );

  const messages =
    await panel.messages
      .fetch({
        limit: 100
      })
      .catch(() => null);

  /*
     نحذف أي لوحة قديمة للبوت
     حتى لا تبقى قائمة قديمة بقيم غير صحيحة.
  */

  if (messages) {
    const oldPanels =
      messages.filter(
        (msg) =>
          msg.author.id ===
            client.user.id &&
          msg.embeds[0]?.title?.includes(
            "نظام تذاكر"
          )
      );

    for (
      const oldMessage of oldPanels.values()
    ) {
      await oldMessage
        .delete()
        .catch(() => {});
    }
  }

  try {
    await panel.send({
      embeds: [embed],
      components: [row]
    });

    console.log(
      "✅ Ticket panel updated successfully."
    );

  } catch (error) {
    console.error(
      "❌ SEND TICKET PANEL ERROR:",
      error
    );
  }
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

  /*
     التأكد من أن القيمة موجودة فعلًا
     داخل نظام التذاكر الجديد.
  */

  const ticketType =
    TICKET_TYPES[type];

  if (!ticketType) {
    console.error(
      "❌ INVALID TICKET TYPE:",
      type
    );

    return interaction.reply({
      content:
        `❌ نوع التذكرة غير صحيح.\n` +
        `القيمة المستلمة: \`${type || "غير موجودة"}\``,
      ephemeral: true
    });
  }

  const category =
    getTicketCategory(guild);

  if (!category) {
    return interaction.reply({
      content:
        "❌ Category التذاكر غير موجودة أو الـID غير صحيح.",
      ephemeral: true
    });
  }

  const permissionCheck =
    checkTicketBotPermissions(
      guild,
      category
    );

  if (!permissionCheck.ok) {
    return interaction.reply({
      content:
        permissionCheck.message,
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

  const validRoles =
    getValidTicketRoles(
      guild,
      ticketType.roles
    );

  if (!validRoles.length) {
    return interaction.reply({
      content:
        "❌ لا يوجد أي Role صالح لهذا القسم.\nتأكد من أن الـIDs صحيحة وأن الرولات موجودة في السيرفر.",
      ephemeral: true
    });
  }

  const safeName =
    interaction.user.username
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]/g,
        ""
      )
      .slice(0, 20) ||
    "user";

  let channel = null;

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

            type:
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

          ...validRoles.map(
            (roleId) => ({
              id:
                roleId,

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
      error
    );

    console.error(
      "=================================="
    );

    return interaction.reply({
      content:
        "❌ لم أستطع إنشاء التذكرة.\n\n" +
        "تأكد من صلاحيات البوت:\n" +
        "• View Channel\n" +
        "• Send Messages\n" +
        "• Read Message History\n" +
        "• Manage Channels",

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

    type:
      type,

    claimedBy:
      null,

    createdAt:
      Date.now()
  };

  saveDB();

  const roleMentions =
    validRoles
      .map(
        (roleId) =>
          `<@&${roleId}>`
      )
      .join(" ");

  const embed =
    new EmbedBuilder()
      .setTitle(
        `${ticketType.emoji} ${ticketType.label}`
      )
      .setDescription(
        `مرحبًا ${interaction.user}\n\n` +
        `تم فتح تذكرتك في قسم **${ticketType.label}**.\n\n` +
        "يرجى شرح طلبك بالتفصيل، وسيقوم الفريق المختص بالرد عليك.\n\n" +
        `🔔 **الفريق المسؤول:**\n${roleMentions}`
      )
      .addFields(
        {
          name:
            "صاحب التذكرة",

          value:
            `${interaction.user}`,

          inline:
            true
        },

        {
          name:
            "نوع التذكرة",

          value:
            `${ticketType.emoji} ${ticketType.label}`,

          inline:
            true
        }
      )
      .setColor(0x57f287)
      .setTimestamp()
      .setFooter({
        text:
          `${CONFIG.SERVER_NAME} • Tickets`
      });

  const buttons =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "ticket_claim"
          )
          .setLabel(
            "استلام التذكرة"
          )
          .setEmoji("📥")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket_close"
          )
          .setLabel(
            "إغلاق التذكرة"
          )
          .setEmoji("🔒")
          .setStyle(
            ButtonStyle.Danger
          )
      );

  try {
    await channel.send({
      content:
        `${interaction.user}\n\n${roleMentions}`,

      embeds: [
        embed
      ],

      components: [
        buttons
      ],

      allowedMentions: {
        users: [
          interaction.user.id
        ],

        roles:
          validRoles
      }
    });

  } catch (error) {
    console.error(
      "❌ SEND TICKET MESSAGE ERROR:",
      error
    );
  }

  await sendTicketLog(
    `🎫 **تم فتح تذكرة جديدة**\n\n` +

    `👤 العضو: ${interaction.user}\n` +

    `📋 القسم: **${ticketType.emoji} ${ticketType.label}**\n` +

    `🎟️ التذكرة: ${channel}\n` +

    `🔔 المسؤولون: ${roleMentions}\n` +

    `🆔 User ID: \`${interaction.user.id}\``
  );

  return interaction.reply({
    content:
      `✅ تم فتح تذكرتك بنجاح: ${channel}`,

    ephemeral:
      true
  });
}

/* =========================================================
   CLAIM TICKET
   ========================================================= */

async function claimTicket(
  interaction
) {
  const channel =
    interaction.channel;

  if (
    !channel ||
    channel.parentId !==
      CONFIG.TICKET_CATEGORY_ID
  ) {
    return interaction.reply({
      content:
        "❌ هذه ليست تذكرة.",
      ephemeral: true
    });
  }

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

  const ticketType =
    TICKET_TYPES[data.type];

  if (!ticketType) {
    return interaction.reply({
      content:
        "❌ نوع التذكرة غير معروف.",
      ephemeral: true
    });
  }

  const isDepartmentStaff =
    ticketType.roles.some(
      (roleId) =>
        interaction.member.roles.cache.has(
          roleId
        )
    );

  if (
    !isAdmin(interaction.member) &&
    !isDepartmentStaff
  ) {
    return interaction.reply({
      content:
        "❌ استلام هذه التذكرة متاح فقط للفريق المسؤول عن هذا القسم.",
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
    db.tickets[channel.id].claimedBy =
      interaction.user.id;
  }

  const attendance =
    getAttendance(
      interaction.user.id
    );

  attendance.ticketsClaimed += 1;
  attendance.points += 1;

  saveDB();

  await interaction.reply(
    `📥 **تم استلام التذكرة بواسطة ${interaction.user}.**`
  );

  await sendTicketLog(
    `📥 **تم استلام تذكرة**\n\n` +

    `🎟️ التذكرة: ${channel}\n` +

    `📋 القسم: **${ticketType.label}**\n` +

    `👤 صاحب التذكرة: <@${data.ownerId}>\n` +

    `👮 المستلم: ${interaction.user}`
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

  if (
    !channel ||
    channel.parentId !==
      CONFIG.TICKET_CATEGORY_ID
  ) {
    return interaction.reply({
      content:
        "❌ هذه ليست تذكرة.",
      ephemeral: true
    });
  }

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

  const ticketType =
    TICKET_TYPES[data.type];

  if (!ticketType) {
    return interaction.reply({
      content:
        "❌ نوع التذكرة غير معروف.",
      ephemeral: true
    });
  }

  const isOwner =
    data.ownerId ===
    interaction.user.id;

  const isDepartmentStaff =
    ticketType.roles.some(
      (roleId) =>
        interaction.member.roles.cache.has(
          roleId
        )
    );

  if (
    !isOwner &&
    !isAdmin(interaction.member) &&
    !isDepartmentStaff
  ) {
    return interaction.reply({
      content:
        "❌ ليس لديك صلاحية إغلاق هذه التذكرة.",
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

    attendance.ticketsClosed += 1;
    attendance.points += 1;

    saveDB();
  }

  const owner =
    await client.users
      .fetch(data.ownerId)
      .catch(() => null);

  if (owner) {
    await owner.send(
      `🔒 **تم إغلاق التذكرة الخاصة بك في ${CONFIG.SERVER_NAME}.**\n\n` +
      `النوع: ${ticketType.label}\n` +
      `تم الإغلاق بواسطة: ${interaction.user.tag}`
    ).catch(() => {});
  }

  await sendTicketLog(
    `🔒 **تم إغلاق تذكرة**\n\n` +

    `🎟️ التذكرة: ${channel.name}\n` +

    `👤 العضو: <@${data.ownerId}>\n` +

    `📋 القسم: **${ticketType.label}**\n` +

    `📥 المستلم: ${
      data.claimedBy
        ? `<@${data.claimedBy}>`
        : "لم يتم الاستلام"
    }\n` +

    `🔒 أغلقها: ${interaction.user}`
  );

  delete db.tickets[channel.id];

  saveDB();

  setTimeout(
    () => {
      channel
        .delete("Ticket closed")
        .catch(
          (error) => {
            console.error(
              "DELETE TICKET ERROR:",
              error
            );
          }
        );
    },
    3000
  );
}

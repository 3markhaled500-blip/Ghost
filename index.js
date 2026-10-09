      const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require("discord.js");

// ==============================
// BARAKAT COMMUNITY CONFIG
// ==============================

const CONFIG = {
  // السيرفر
  GUILD_ID: "1525640813831258183",

  // روم الترحيب
  WELCOME_CHANNEL_ID: "1525643339699847178",

  // رول طلقاء
  WELCOME_ROLE_ID: "1532611461245964389",

  // رول Streamer Mod
  STREAMER_MOD_ROLE_ID: "1550780555753299968",

  // روم مراجعة التقديمات
  REVIEW_CHANNEL_ID: "1550783950060789880",

  // روم بانل التقديم
  APPLICATION_PANEL_CHANNEL_ID: "1550783900261818468",

  // رابط البانر
  BANNER_URL: "https://cdn.discordapp.com/banners/1545951349919711282/2744d1c5046464da9883162cb9f01183.webp?size=1024"
};

// ==============================
// CLIENT
// ==============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],

  partials: [
    Partials.Channel
  ]
});

// ==============================
// SETTINGS
// ==============================

const YELLOW = 0xF5B700;
const GREEN = 0x2ECC71;
const RED = 0xE74C3C;

const questions = [
  "ما اسمك؟",

  "كم عمرك؟",

  "الخبرة في؟ 𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠.",

  "عاوز تقدم مود تيك توك ولا كيك؟  ",

  "ازاي تعمل؟ (Ban) للشخص وامتى تعمل له (Ban)",

  "تعمل ايه عشان تعمل تصويت (وامتى تعمل تصويت)؟",

  "تعمل ايه عشان تغير وضع اللعبة (وامتى تغير وضع اللعبة)؟",
  

  "ازاي تعين عنوان البث؟"
];

// منع الشخص من عمل أكثر من تقديم في نفس الوقت
const activeApplications = new Set();

// ==============================
// BOT READY
// ==============================

client.once("ready", async () => {

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🟡 BARAKAT COMMUNITY");
  console.log(`✅ Bot Online: ${client.user.tag}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ============================
  // إرسال بانل التقديم
  // ============================

  const channel = await client.channels
    .fetch(CONFIG.APPLICATION_PANEL_CHANNEL_ID)
    .catch(() => null);

  if (!channel || !channel.isTextBased()) {

    console.log(
      "❌ لم يتم العثور على روم بانل التقديم."
    );

    return;
  }

  const embed = new EmbedBuilder()

    .setColor(YELLOW)

    .setTitle(
      "🎥 BARAKAT COMMUNITY"
    )

    .setDescription(
      "## 🎥 𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠\n\n" +

      "هل ترغب في الانضمام إلى فريق **𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠 **؟\n\n" +

      "اضغط على الزر بالأسفل لبدء التقديم.\n\n" +

      "📩 **الأسئلة:** سيتم إرسالها لك في الخاص.\n" +
      "📝 **الإجابة:** سؤال ثم جواب.\n" +
      "🔎 **المراجعة:** سيتم إرسال التقديم لفريق المراجعة.\n" +
      "📨 **النتيجة:** ستصلك في الخاص.\n\n" +

      "━━━━━━━━━━━━━━━━━━━━\n" +

      "🟡 **BARAKAT COMMUNITY**"
    )

    .setFooter({
      text: "BARAKAT COMMUNITY • 𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠 "
    })

    .setTimestamp();

  if (
    CONFIG.BANNER_URL &&
    !CONFIG.BANNER_URL.includes("حط_رابط")
  ) {

    embed.setImage(
      CONFIG.BANNER_URL
    );
  }

  const row = new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(
        "streamer_apply"
      )

      .setLabel(
        "تقديم  𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠"
      )

      .setEmoji("🎥")

      .setStyle(
        ButtonStyle.Primary
      )
  );

  await channel.send({

    embeds: [
      embed
    ],

    components: [
      row
    ]

  }).catch(console.error);

  console.log(
    "✅ تم إرسال بانل 𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠."
  );
});

// ==============================
// MEMBER JOIN
// ==============================

client.on(
  "guildMemberAdd",
  async member => {

    try {

      if (
        member.guild.id !==
        CONFIG.GUILD_ID
      ) {
        return;
      }

      // ============================
      // إعطاء رول طلقاء
      // ============================

      const welcomeRole =
        await member.guild.roles
          .fetch(
            CONFIG.WELCOME_ROLE_ID
          )
          .catch(() => null);

      if (welcomeRole) {

        await member.roles
          .add(welcomeRole)
          .catch(console.error);

      }

      // ============================
      // روم الترحيب
      // ============================

      const channel =
        await client.channels
          .fetch(
            CONFIG.WELCOME_CHANNEL_ID
          )
          .catch(() => null);

      if (
        !channel ||
        !channel.isTextBased()
      ) {
        return;
      }

      // ============================
      // رسالة الترحيب
      // ============================

      const embed =
        new EmbedBuilder()

          .setColor(
            YELLOW
          )

          .setTitle(
            "👋 أهلاً وسهلاً بك في BARAKAT COMMUNITY"
          )

          .setDescription(

            `##  نورت السيرفر يا ${member}\n\n` +

            "أهلاً وسهلاً بك في **BARAKAT COMMUNITY** ❤️\n\n" +

            "🎮 نتمنى لك وقتًا ممتعًا معنا.\n" +

            "📜 لا تنسَ قراءة القوانين.\n\n" +

            "━━━━━━━━━━━━━━━━━━━━\n" +

            `👤 العضو: ${member}\n` +

            `🆔 ID: \`${member.id}\`\n\n` +

            "🟡 **استمتع بوقتك معنا!**"

          )

          .setThumbnail(

            member.user.displayAvatarURL({
              size: 512,
              extension: "png"
            })

          )

          .setFooter({

            text:
              "BARAKAT COMMUNITY"

          })

          .setTimestamp();

      // ============================
      // إضافة البانر
      // ============================

      if (
        CONFIG.BANNER_URL &&
        !CONFIG.BANNER_URL.includes("حط_رابط")
      ) {

        embed.setImage(
          CONFIG.BANNER_URL
        );

      }

      await channel.send({

        content:
          `${member}`,

        embeds: [
          embed
        ]

      });

    } catch (error) {

      console.error(
        "❌ Welcome Error:",
        error
      );

    }

  }
);

// ==============================
// INTERACTIONS
// ==============================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // =====================================================
      // BUTTONS
      // =====================================================

      if (
        interaction.isButton()
      ) {

        // ============================================
        // START APPLICATION
        // ============================================

        if (
          interaction.customId ===
          "streamer_apply"
        ) {

          const user =
            interaction.user;

          // منع تقديمين في نفس الوقت
          if (
            activeApplications.has(
              user.id
            )
          ) {

            return interaction.reply({

              content:
                "⚠️ لديك تقديم قيد التنفيذ بالفعل. راجع الخاص.",

              ephemeral: true

            });

          }

          // إضافة المستخدم للقائمة
          activeApplications.add(
            user.id
          );

          try {

            await interaction.reply({

              content:
                "📩 تم بدء التقديم.\n\nافتح الخاص مع البوت للإجابة على الأسئلة.",

              ephemeral: true

            });

            let dm;

            try {

              dm =
                await user.createDM();

              await dm.send(

                "━━━━━━━━━━━━━━━━━━━━\n" +

                "🎥 **BARAKAT COMMUNITY**\n" +

                "## 𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠  Application\n\n" +

                "أهلًا بك في نموذج التقديم.\n\n" +

                "سأرسل لك الأسئلة واحدًا تلو الآخر.\n\n" +

                "⏱️ لديك **15 دقائق** للإجابة على كل سؤال.\n\n" +

                "❌ إذا أردت إلغاء التقديم اكتب:\n" +

                "`إلغاء`\n\n" +

                "━━━━━━━━━━━━━━━━━━━━"

              );

            } catch {

              activeApplications.delete(
                user.id
              );

              return interaction.editReply({

                content:
                  "❌ لا أستطيع إرسال رسالة خاصة لك.\n\nافتح الـDM مع البوت ثم حاول مرة أخرى."

              });

            }

            const answers = [];

            // ========================================
            // QUESTIONS
            // ========================================

            for (
              let i = 0;
              i < questions.length;
              i++
            ) {

              await dm.send(

                `━━━━━━━━━━━━━━━━━━━━\n` +

                `### السؤال ${i + 1}/${questions.length}\n\n` +

                `${questions[i]}\n\n` +

           

              );

              const collected =
                await dm.awaitMessages({

                  filter:
                    message =>
                      message.author.id ===
                      user.id,

                  max: 1,

                  time:
                    5 * 60 * 1000

                });

              // الوقت انتهى
              if (
                !collected.size
              ) {

                await dm.send(

                  "❌ انتهى وقت الإجابة.\n\nتم إلغاء التقديم."

                );

                activeApplications.delete(
                  user.id
                );

                return interaction.editReply({

                  content:
                    "❌ انتهى وقت التقديم وتم إلغاؤه."

                });

              }

              const answer =
                collected.first().content;

              // إلغاء
              if (

                answer
                  .trim()
                  .toLowerCase() ===
                  "إلغاء" ||

                answer
                  .trim()
                  .toLowerCase() ===
                  "cancel"

              ) {

                await dm.send(

                  "❌ تم إلغاء التقديم."

                );

                activeApplications.delete(
                  user.id
                );

                return interaction.editReply({

                  content:
                    "❌ تم إلغاء التقديم."

                });

              }

              answers.push(
                answer
              );

            }

            // ========================================
            // REVIEW CHANNEL
            // ========================================

            const reviewChannel =
              await client.channels
                .fetch(
                  CONFIG.REVIEW_CHANNEL_ID
                )
                .catch(() => null);

            if (
              !reviewChannel ||
              !reviewChannel.isTextBased()
            ) {

              await dm.send(

                "❌ حدث خطأ: لم يتم العثور على روم المراجعة."

              );

              activeApplications.delete(
                user.id
              );

              return interaction.editReply({

                content:
                  "❌ روم المراجعة غير موجود."

              });

            }

            // ========================================
            // APPLICATION EMBED
            // ========================================

            const embed =
              new EmbedBuilder()

                .setColor(
                  YELLOW
                )

                .setTitle(
                  "📋 طلب 𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠 جديد"
                )

                .setThumbnail(

                  user.displayAvatarURL({

                    size: 512,

                    extension:
                      "png"

                  })

                )

                .setDescription(

                  "━━━━━━━━━━━━━━━━━━━━\n" +

                  `👤 **المتقدم:** ${user}\n` +

                  `🆔 **Discord ID:** \`${user.id}\`\n` +

                  "🟡 **الحالة:** قيد المراجعة\n" +

                  "━━━━━━━━━━━━━━━━━━━━"

                )

                .setTimestamp()

                .setFooter({

                  text:
                    "BARAKAT COMMUNITY • Review System"

                });

            // ========================================
            // ADD QUESTIONS + ANSWERS
            // ========================================

            questions.forEach(
              (question, index) => {

                let answer =
                  answers[index] ||
                  "لا توجد إجابة.";

                // Discord field limit
                if (
                  answer.length >
                  1024
                ) {

                  answer =
                    answer.substring(
                      0,
                      1021
                    ) +
                    "...";

                }

                embed.addFields({

                  name:
                    `${index + 1}️⃣ ${question}`,

                  value:
                    answer,

                  inline:
                    false

                });

              }
            );

            // ========================================
            // REVIEW BUTTONS
            // ========================================

            const buttons =
              new ActionRowBuilder()
                .addComponents(

                  new ButtonBuilder()

                    .setCustomId(
                      `accept_${user.id}`
                    )

                    .setLabel(
                      "قبول"
                    )

                    .setEmoji(
                      "✅"
                    )

                    .setStyle(
                      ButtonStyle.Success
                    ),

                  new ButtonBuilder()

                    .setCustomId(
                      `reject_${user.id}`
                    )

                    .setLabel(
                      "رفض"
                    )

                    .setEmoji(
                      "❌"
                    )

                    .setStyle(
                      ButtonStyle.Danger
                    )

                );

            await reviewChannel.send({

              embeds: [
                embed
              ],

              components: [
                buttons
              ]

            });

            // ========================================
            // SUCCESS DM
            // ========================================

            await dm.send(

              "━━━━━━━━━━━━━━━━━━━━\n" +

              "✅ **تم إرسال تقديمك بنجاح!**\n\n" +

              "تم إرسال طلبك إلى فريق المراجعة.\n\n" +

              "📩 ستصلك نتيجة القبول أو الرفض في الخاص.\n\n" +

              "🟡 **BARAKAT COMMUNITY**\n" +

              "━━━━━━━━━━━━━━━━━━━━"

            );

            await interaction.editReply({

              content:
                "✅ تم إرسال تقديمك إلى فريق المراجعة بنجاح."

            });

            activeApplications.delete(
              user.id
            );

          } catch (error) {

            console.error(
              "❌ Application Error:",
              error
            );

            activeApplications.delete(
              interaction.user.id
            );

            try {

              await interaction.editReply({

                content:
                  "❌ حدث خطأ أثناء التقديم. حاول مرة أخرى."

              });

            } catch {}

          }

          return;
        }

        // ============================================
        // ACCEPT APPLICATION
        // ============================================

        if (
          interaction.customId.startsWith(
            "accept_"
          )
        ) {

          // صلاحيات المراجع
          if (

            !interaction.member.permissions.has(
              PermissionsBitField.Flags.ManageGuild
            ) &&

            !interaction.member.permissions.has(
              PermissionsBitField.Flags.Administrator
            )

          ) {

            return interaction.reply({

              content:
                "❌ ليس لديك صلاحية مراجعة التقديمات.",

              ephemeral:
                true

            });

          }

          const userId =
            interaction.customId.replace(
              "accept_",
              ""
            );

          const member =
            await interaction.guild.members
              .fetch(userId)
              .catch(() => null);

          if (!member) {

            return interaction.reply({

              content:
                "❌ العضو غير موجود في السيرفر.",

              ephemeral:
                true

            });

          }

          const role =
            await interaction.guild.roles
              .fetch(
                CONFIG.STREAMER_MOD_ROLE_ID
              )
              .catch(() => null);

          if (!role) {

            return interaction.reply({

              content:
                "❌ لم يتم العثور على رول Streamer Mod.",

              ephemeral:
                true

            });

          }

          // إعطاء الرول
          try {

            await member.roles.add(
              role
            );

          } catch {

            return interaction.reply({

              content:
                "❌ لم أستطع إعطاء الرول.\n\nتأكد أن رتبة البوت أعلى من رتبة Streamer Mod.",

              ephemeral:
                true

            });

          }

          // ========================================
          // CHANGE EMBED STATUS
          // ========================================

          const oldEmbed =
            interaction.message.embeds[0];

          const newEmbed =
            EmbedBuilder
              .from(oldEmbed)

              .setColor(
                GREEN
              )

              .setDescription(

                `${oldEmbed.description || ""}\n\n` +

                "━━━━━━━━━━━━━━━━━━━━\n" +

                "## ✅ تم قبول التقديم\n\n" +

                `👮 **تم قبوله بواسطة:** ${interaction.user}`

              )

              .setFooter({

                text:
                  "BARAKAT COMMUNITY • ACCEPTED"

              });

          // ========================================
          // DISABLE BUTTON
          // ========================================

          const doneButton =
            new ActionRowBuilder()
              .addComponents(

                new ButtonBuilder()

                  .setCustomId(
                    "application_done"
                  )

                  .setLabel(
                    "تم قبول التقديم"
                  )

                  .setEmoji(
                    "✅"
                  )

                  .setStyle(
                    ButtonStyle.Success
                  )

                  .setDisabled(
                    true
                  )

              );

          await interaction.update({

            embeds: [
              newEmbed
            ],

            components: [
              doneButton
            ]

          });

          // ========================================
          // SEND DM
          // ========================================

          const user =
            await client.users
              .fetch(userId)
              .catch(() => null);

          if (user) {

            await user.send(

              "━━━━━━━━━━━━━━━━━━━━\n" +

              "🎉 **مبروك!**\n\n" +

              "تم **قبول** تقديمك كـ **مقبول  مبدئيا** في:\n" +

              "🟡 **𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠 **\n\n" +

              `👮 **تم قبولك بواسطة:** ${interaction.user.username}\n\n` +

              "🎭 𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠  تم إعطاؤك الرول بنجاح مقبول  مبدئيا استعد لعمل المقابلة للرولا النهاء كا.\n\n" +

              "━━━━━━━━━━━━━━━━━━━━"

            ).catch(() => {});

          }

          return;
        }

        // ============================================
        // REJECT APPLICATION
        // ============================================

        if (
          interaction.customId.startsWith(
            "reject_"
          )
        ) {

          // صلاحيات المراجع
          if (

            !interaction.member.permissions.has(
              PermissionsBitField.Flags.ManageGuild
            ) &&

            !interaction.member.permissions.has(
              PermissionsBitField.Flags.Administrator
            )

          ) {

            return interaction.reply({

              content:
                "❌ ليس لديك صلاحية مراجعة التقديمات.",

              ephemeral:
                true

            });

          }

          const userId =
            interaction.customId.replace(
              "reject_",
              ""
            );

          // ========================================
          // REJECT MODAL
          // ========================================

          const modal =
            new ModalBuilder()

              .setCustomId(
                `reject_modal_${userId}`
              )

              .setTitle(
                "❌ رفض MOD "
              );

          const reason =
            new TextInputBuilder()

              .setCustomId(
                "reason"
              )

              .setLabel(
                "سبب الرفض"
              )

              .setPlaceholder(
                "اكتب سبب رفض التقديم هنا..."
              )

              .setStyle(
                TextInputStyle.Paragraph
              )

              .setRequired(
                true
              )

              .setMaxLength(
                1000
              );

          modal.addComponents(

            new ActionRowBuilder()
              .addComponents(
                reason
              )

          );

          await interaction.showModal(
            modal
          );

          return;
        }
      }

// =====================================================
      // REJECT MODAL
      // =====================================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "reject_modal_"
        )
      ) {

        const userId =
          interaction.customId.replace(
            "reject_modal_",
            ""
          );

        const reason =
          interaction.fields.getTextInputValue(
            "reason"
          );

        // ========================================
        // CHANGE APPLICATION STATUS
        // ========================================

        const oldEmbed =
          interaction.message.embeds[0];

        const newEmbed =
          EmbedBuilder
            .from(oldEmbed)

            .setColor(
              RED
            )

            .setDescription(

              `${oldEmbed.description || ""}\n\n` +

              "━━━━━━━━━━━━━━━━━━━━\n" +

              "## ❌ تم رفض التقديم\n\n" +

              `📝 **سبب الرفض:** ${reason}\n\n` +

              `👮 **تم رفضه بواسطة:** ${interaction.user}`

            )

            .setFooter({

              text:
                "BARAKAT COMMUNITY • REJECTED"

            });

        const doneButton =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  "application_rejected"
                )

                .setLabel(
                  "تم رفض التقديم"
                )

                .setEmoji(
                  "❌"
                )

                .setStyle(
                  ButtonStyle.Danger
                )

                .setDisabled(
                  true
                )

            );

        await interaction.update({

          embeds: [
            newEmbed
          ],

          components: [
            doneButton
          ]

        });

        // ========================================
        // SEND RESULT TO USER
        // ========================================

        const user =
          await client.users
            .fetch(userId)
            .catch(() => null);

        if (user) {

          await user.send(

            "━━━━━━━━━━━━━━━━━━━━\n" +

            "❌ **تم رفض تقديمك**\n\n" +

            "تقديمك كـ **𝗠𝗢𝗗 𝗦𝗧𝗥𝗘𝗔𝗠 ** في:\n" +

            "🟡 **BARAKAT COMMUNITY**\n\n" +

            `📝 **سبب الرفض:** ${reason}\n\n` +

            `👮 **تم الرفض بواسطة:** ${interaction.user.username}\n\n` +

            "يمكنك التقديم مرة أخرى إذا تم فتح التقديم من جديد.\n\n" +

            "━━━━━━━━━━━━━━━━━━━━"

          ).catch(() => {});

        }

        return;
      }

    } catch (error) {

      console.error(
        "❌ Interaction Error:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        await interaction.reply({

          content:
            "❌ حدث خطأ غير متوقع.",

          ephemeral:
            true

        }).catch(() => {});

      }

    }

  }
);

// ==============================
// LOGIN
// ==============================

// التوكن موجود في Railway فقط
client.login(
  process.env.BOT_TOKEN
);

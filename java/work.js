/**
 * work.js - Interactive Broadcast Tuner Deck Controller (work.html)
 * Dynamically switches the CRT Monitor viewport and Retro OS Telemetry Terminal
 * across three verified client channels with zero page reload.
 */

(function () {
  "use strict";

  const CHANNELS = {
    ch01: {
      id: "ch01",
      feedBadge: "FEED: CH-01",
      image: "images/portfolio/group_flyer.png",
      alt: "Pathways for Change community outreach poster",
      category: "CIVIC INFORMATION DESIGN",
      dialTopDeg: 38,
      dialBottomDeg: -32,
      problem:
        "Community outreach and support initiatives frequently struggle to communicate critical logistics without overwhelming participants or burying contact points under bureaucratic text blocks.",
      solutions: [
        {
          lead: "The Foundation (Making Media Matter):",
          detail:
            "Prioritizes immediate public trust over promotional vanity, putting confidential hotline support and accessibility access front and center."
        },
        {
          lead: "Pillar 2 (Operational Reality and Intuitive Flow):",
          detail:
            "Organizes dense operational data (recurring meeting cadences, Zoom details, and physical meet-up notes) into a scannable visual hierarchy."
        },
        {
          lead: "Pillar 3 (Platform Native Utility):",
          detail:
            "Built specifically for high-utility community sharing, civic syndication, and clean offline printing."
        },
        {
          lead: "The Capstone (Intentional Community Growth):",
          detail:
            "Removes friction for vulnerable individuals seeking connection, turning an intimidating support service into an accessible community group."
        }
      ]
    },
    ch02: {
      id: "ch02",
      feedBadge: "FEED: CH-02",
      image: "images/portfolio/graphic_example1.png",
      alt: "Citizen Crust Wednesday Night DJ Bingo promotional graphic",
      category: "HOSPITALITY EVENT ACTIVATION",
      dialTopDeg: 95,
      dialBottomDeg: 24,
      problem:
        "Independent restaurants and taprooms regularly battle dead midweek calendar slots where kitchen overhead runs high while dining room seats sit empty.",
      solutions: [
        {
          lead: "The Foundation (Making Media Matter):",
          detail:
            "Replaces generic sales posts with an engaging, interactive event hook that offers entertainment and humor before asking customers to spend a dollar."
        },
        {
          lead: "Pillar 1 (Acquisition and Loyalty):",
          detail:
            "Activates existing patrons by giving weekday regulars a competitive reason to return, while incentivizing them to bring groups of friends."
        },
        {
          lead: "Pillar 2 (Operational Reality and Intuitive Flow):",
          detail:
            "Grounded in real floor capacity and timing constraints, highlighting clear 6:30 to 8:30 PM event hours."
        },
        {
          lead: "The Capstone (Intentional Community Growth):",
          detail:
            "Converts a quiet Wednesday into a lively recurring ritual, driving physical foot traffic and establishing the venue as a dependable neighborhood hangout."
        }
      ]
    },
    ch03: {
      id: "ch03",
      feedBadge: "FEED: CH-03",
      image: "images/portfolio/coffeehouse-post2.png",
      alt: "Tiny's Coffeehouse fresh berry and granola breakfast bowl",
      category: "COMMERCIAL PRODUCT PHOTOGRAPHY",
      dialTopDeg: 152,
      dialBottomDeg: 78,
      problem:
        "Neighborhood cafes often settle for sterile stock imagery or muddy smartphone snapshots that fail to capture freshness and get ignored by morning mobile scrollers.",
      solutions: [
        {
          lead: "The Foundation (Making Media Matter):",
          detail:
            "Delivers an authentic, visually rich food asset that provides immediate appetizing value rather than a loud corporate sales pitch."
        },
        {
          lead: "Pillar 1 (Acquisition and Loyalty):",
          detail:
            "Focuses on celebrating everyday craftsmanship and core menu quality, reinforcing to daily commuters that their regular breakfast stop takes pride in its ingredients."
        },
        {
          lead: "Pillar 3 (Platform Native Utility):",
          detail:
            "Treats Instagram as a high-resolution visual portfolio where crisp composition, natural light, and organic textures stop thumbs naturally."
        },
        {
          lead: "The Capstone (Intentional Community Growth):",
          detail:
            "Bridges the gap between digital discovery and real-world door-swings, motivating neighborhood locals to make an intentional morning visit."
        }
      ]
    }
  };

  const CHANNEL_ORDER = ["ch01", "ch02", "ch03"];

  document.addEventListener("DOMContentLoaded", function () {
    const pushButtons = Array.from(document.querySelectorAll(".tuner-push-btn"));
    const feedBadgeEl = document.getElementById("crt-feed-badge");
    const activeImageEl = document.getElementById("crt-active-image");
    const categoryEl = document.getElementById("telemetry-category");
    const problemEl = document.getElementById("telemetry-problem");
    const solutionsListEl = document.getElementById("telemetry-solutions");
    const dialTopBar = document.querySelector("#crt-dial-channel .crt-dial-bar");
    const dialBottomBar = document.querySelector("#crt-dial-fine .crt-dial-bar");
    const dialButtons = Array.from(document.querySelectorAll(".crt-dial"));

    if (
      !pushButtons.length ||
      !feedBadgeEl ||
      !activeImageEl ||
      !categoryEl ||
      !problemEl ||
      !solutionsListEl
    ) {
      return;
    }

    // Preload all portfolio images for instantaneous channel tuning
    Object.values(CHANNELS).forEach(function (channel) {
      const preloadImg = new Image();
      preloadImg.src = channel.image;
    });

    let activeChannelKey = "ch01";

    function selectChannel(channelKey, moveFocus) {
      const data = CHANNELS[channelKey];
      if (!data) {
        return;
      }

      activeChannelKey = channelKey;

      // Update tactile push-button states and ARIA attributes
      pushButtons.forEach(function (btn) {
        const isCurrent = btn.getAttribute("data-channel") === channelKey;
        btn.classList.toggle("active", isCurrent);
        btn.setAttribute("aria-selected", isCurrent ? "true" : "false");
        btn.setAttribute("tabindex", isCurrent ? "0" : "-1");
        if (isCurrent && moveFocus) {
          btn.focus();
        }
      });

      // Rotate physical CRT rotary knobs
      if (dialTopBar) {
        dialTopBar.style.transform = "rotate(" + data.dialTopDeg + "deg)";
      }
      if (dialBottomBar) {
        dialBottomBar.style.transform = "rotate(" + data.dialBottomDeg + "deg)";
      }

      // Brief CRT channel-switch pulse on screen image
      activeImageEl.classList.add("channel-switching");

      // Update CRT feed badge and image
      feedBadgeEl.textContent = data.feedBadge;
      activeImageEl.src = data.image;
      activeImageEl.alt = data.alt;

      // Update Retro OS Telemetry Terminal fields
      categoryEl.textContent = data.category;
      problemEl.textContent = data.problem;

      // Rebuild Pillar Matrix bullet list cleanly
      solutionsListEl.innerHTML = "";
      data.solutions.forEach(function (item) {
        const li = document.createElement("li");
        const strong = document.createElement("strong");
        strong.textContent = item.lead + " ";
        li.appendChild(strong);
        li.appendChild(document.createTextNode(item.detail));
        solutionsListEl.appendChild(li);
      });

      window.setTimeout(function () {
        activeImageEl.classList.remove("channel-switching");
      }, 120);
    }

    // Bind click and keyboard navigation on channel push-buttons
    pushButtons.forEach(function (btn, index) {
      btn.addEventListener("click", function () {
        const targetChannel = btn.getAttribute("data-channel");
        selectChannel(targetChannel, false);
      });

      btn.addEventListener("keydown", function (event) {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          const nextIndex = (index + 1) % CHANNEL_ORDER.length;
          selectChannel(CHANNEL_ORDER[nextIndex], true);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          const prevIndex = (index - 1 + CHANNEL_ORDER.length) % CHANNEL_ORDER.length;
          selectChannel(CHANNEL_ORDER[prevIndex], true);
        } else if (event.key === "Home") {
          event.preventDefault();
          selectChannel(CHANNEL_ORDER[0], true);
        } else if (event.key === "End") {
          event.preventDefault();
          selectChannel(CHANNEL_ORDER[CHANNEL_ORDER.length - 1], true);
        }
      });
    });

    // Allow clicking the physical rotary dials on the CRT chassis to cycle channels
    dialButtons.forEach(function (dial) {
      dial.addEventListener("click", function () {
        const currentIndex = CHANNEL_ORDER.indexOf(activeChannelKey);
        const nextIndex = (currentIndex + 1) % CHANNEL_ORDER.length;
        selectChannel(CHANNEL_ORDER[nextIndex], false);
      });
    });
  });
})();

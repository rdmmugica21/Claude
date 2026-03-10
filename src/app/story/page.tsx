"use client";

import { useState } from "react";

const DARK_OLIVE = "#2F3E2E";
const WARM_CREAM = "#FFF8F0";
const WARM_CREAM_DIM = "rgba(255, 248, 240, 0.5)";

interface SlideProps {
  children: React.ReactNode;
  bgImage?: boolean;
  slideNumber: number;
  totalSlides: number;
}

function Slide({ children, bgImage, slideNumber, totalSlides }: SlideProps) {
  return (
    <div
      className="relative flex flex-col justify-center px-10 py-16"
      style={{
        width: "100%",
        maxWidth: 430,
        aspectRatio: "9 / 16",
        backgroundColor: bgImage ? "#1a2619" : DARK_OLIVE,
        color: WARM_CREAM,
        overflow: "hidden",
      }}
    >
      {/* Progress dots */}
      <div className="absolute top-6 left-0 right-0 flex justify-center gap-1.5 px-4">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full"
            style={{
              backgroundColor:
                i === slideNumber
                  ? WARM_CREAM
                  : `rgba(255, 248, 240, 0.25)`,
            }}
          />
        ))}
      </div>

      {/* Background image for Story 5 */}
      {bgImage && <PhoneMockupBackground />}

      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Line({
  children,
  bold,
  dim,
  small,
  italic,
}: {
  children: React.ReactNode;
  bold?: boolean;
  dim?: boolean;
  small?: boolean;
  italic?: boolean;
}) {
  return (
    <p
      className="leading-[1.9]"
      style={{
        fontSize: small ? 16 : 20,
        fontWeight: bold ? 700 : 400,
        color: dim ? WARM_CREAM_DIM : WARM_CREAM,
        fontStyle: italic ? "italic" : "normal",
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </p>
  );
}

function Spacer() {
  return <div className="h-5" />;
}

function PhoneMockupBackground() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-20">
      <svg
        width="360"
        height="640"
        viewBox="0 0 360 640"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left phone */}
        <g transform="translate(20, 80) rotate(-6, 70, 240)">
          <rect
            x="0"
            y="0"
            width="140"
            height="280"
            rx="16"
            stroke={WARM_CREAM}
            strokeWidth="2.5"
            fill="none"
          />
          <rect
            x="8"
            y="30"
            width="124"
            height="220"
            rx="4"
            fill={WARM_CREAM}
            fillOpacity="0.08"
          />
          <rect x="50" y="12" width="40" height="6" rx="3" fill={WARM_CREAM} fillOpacity="0.3" />
          {/* Rating bars */}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect
                x="18"
                y={55 + i * 40}
                width="50"
                height="6"
                rx="3"
                fill={WARM_CREAM}
                fillOpacity="0.2"
              />
              <rect
                x="18"
                y={67 + i * 40}
                width={70 + Math.random() * 40}
                height="10"
                rx="5"
                fill={WARM_CREAM}
                fillOpacity={0.15 + i * 0.05}
              />
            </g>
          ))}
        </g>
        {/* Right phone */}
        <g transform="translate(200, 80) rotate(6, 70, 240)">
          <rect
            x="0"
            y="0"
            width="140"
            height="280"
            rx="16"
            stroke={WARM_CREAM}
            strokeWidth="2.5"
            fill="none"
          />
          <rect
            x="8"
            y="30"
            width="124"
            height="220"
            rx="4"
            fill={WARM_CREAM}
            fillOpacity="0.08"
          />
          <rect x="50" y="12" width="40" height="6" rx="3" fill={WARM_CREAM} fillOpacity="0.3" />
          {/* Rating bars */}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect
                x="18"
                y={55 + i * 40}
                width="50"
                height="6"
                rx="3"
                fill={WARM_CREAM}
                fillOpacity="0.2"
              />
              <rect
                x="18"
                y={67 + i * 40}
                width={40 + Math.random() * 50}
                height="10"
                rx="5"
                fill={WARM_CREAM}
                fillOpacity={0.15 + i * 0.05}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function StoryPost() {
  const [current, setCurrent] = useState(0);
  const totalSlides = 7;

  const goNext = () => setCurrent((c) => Math.min(c + 1, totalSlides - 1));
  const goPrev = () => setCurrent((c) => Math.max(c - 1, 0));

  const slides = [
    // Story 1
    <Slide key={0} slideNumber={0} totalSlides={totalSlides}>
      <Line>Hailey and I don&apos;t have</Line>
      <Line>a dramatic marriage story.</Line>
      <Spacer />
      <Line dim>No big blowout. No almost-divorce.</Line>
      <Spacer />
      <Line>And honestly?</Line>
      <Line bold>That made it harder to see</Line>
      <Line bold>what was happening.</Line>
    </Slide>,

    // Story 2
    <Slide key={1} slideNumber={1} totalSlides={totalSlides}>
      <Line>We had kids back to back.</Line>
      <Line>Sold our home.</Line>
      <Line>Moved away from everything we knew.</Line>
      <Line>Started a business.</Line>
      <Line bold>Failed.</Line>
      <Line>Started over.</Line>
      <Spacer />
      <Line dim>Life wasn&apos;t falling apart.</Line>
      <Line dim italic>It was just full.</Line>
    </Slide>,

    // Story 3 — the screenshot slide
    <Slide key={2} slideNumber={2} totalSlides={totalSlides}>
      <Line dim>Somewhere in all of that</Line>
      <Line dim>we stopped being intentional</Line>
      <Line dim>with each other.</Line>
      <Spacer />
      <Line>We were great business partners.</Line>
      <Line>Great co-parents.</Line>
      <Line>Great at keeping the plates spinning.</Line>
      <Spacer />
      <Line bold>But we stopped</Line>
      <Line bold>checking in on us.</Line>
    </Slide>,

    // Story 4
    <Slide key={3} slideNumber={3} totalSlides={totalSlides}>
      <Line dim>We didn&apos;t need therapy.</Line>
      <Line dim>We didn&apos;t need a weekend retreat.</Line>
      <Line dim>We didn&apos;t need another book.</Line>
      <Spacer />
      <Line bold>We needed 10 minutes a week</Line>
      <Line>to look each other in the eye</Line>
      <Line>and ask real questions</Line>
      <Line>about where we actually stood.</Line>
    </Slide>,

    // Story 5 — mockup slide
    <Slide key={4} slideNumber={4} totalSlides={totalSlides} bgImage>
      <Line bold>That&apos;s why we built Spark Check-In.</Line>
      <Spacer />
      <Line>9 areas of your marriage.</Line>
      <Line>Rate them 1 to 5.</Line>
      <Line>See where you&apos;re aligned</Line>
      <Line>and where you&apos;re not.</Line>
      <Spacer />
      <Line bold>10 minutes. Every Sunday.</Line>
      <Line bold>On your phone.</Line>
    </Slide>,

    // Story 6 — conversion slide
    <Slide key={5} slideNumber={5} totalSlides={totalSlides}>
      <Line bold>Spark didn&apos;t save our marriage.</Line>
      <Line bold>Our marriage wasn&apos;t in danger.</Line>
      <Spacer />
      <Line>It gave us a rhythm</Line>
      <Line>to dream together again.</Line>
      <Spacer />
      <Line>To actually build something together</Line>
      <Line dim>instead of just surviving the week.</Line>
    </Slide>,

    // Story 7 — CTA
    <Slide key={6} slideNumber={6} totalSlides={totalSlides}>
      <Line dim>If your marriage isn&apos;t broken</Line>
      <Line dim>but it&apos;s not what it used to be either…</Line>
      <Spacer />
      <Line bold>Try Spark.</Line>
      <Spacer />
      <Line>$97 for the whole year.</Line>
      <Line>One account covers both of you.</Line>
      <Spacer />
      <div
        className="mt-4 inline-block rounded-full px-8 py-3 text-center font-semibold"
        style={{
          backgroundColor: WARM_CREAM,
          color: DARK_OLIVE,
          fontSize: 16,
        }}
      >
        Link in bio
      </div>
    </Slide>,
  ];

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 py-12"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-2xl font-bold"
          style={{ color: WARM_CREAM }}
        >
          Spark Story Post
        </h1>
        <p className="mt-2 text-sm" style={{ color: WARM_CREAM_DIM }}>
          Tap the sides to navigate &middot; Story {current + 1} of {totalSlides}
        </p>
      </div>

      {/* Story viewer */}
      <div className="relative" style={{ maxWidth: 430, width: "100%" }}>
        {/* Tap areas */}
        <div
          className="absolute left-0 top-0 z-20 h-full cursor-pointer"
          style={{ width: "30%" }}
          onClick={goPrev}
        />
        <div
          className="absolute right-0 top-0 z-20 h-full cursor-pointer"
          style={{ width: "70%" }}
          onClick={goNext}
        />

        {slides[current]}
      </div>

      {/* Dot navigation */}
      <div className="flex items-center gap-3">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="h-3 w-3 rounded-full transition-all"
            style={{
              backgroundColor: i === current ? WARM_CREAM : "rgba(255,248,240,0.25)",
              transform: i === current ? "scale(1.3)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Posting note */}
      <div
        className="max-w-md rounded-lg px-6 py-4 text-center text-sm"
        style={{
          backgroundColor: "rgba(255,248,240,0.05)",
          color: WARM_CREAM_DIM,
          border: `1px solid rgba(255,248,240,0.1)`,
        }}
      >
        Post between <strong style={{ color: WARM_CREAM }}>7–9 PM</strong> tonight to catch couples after the kids are down.
      </div>
    </div>
  );
}

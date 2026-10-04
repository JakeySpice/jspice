"use strict";

// Reuse the recordings, source text, and timing from the original companion.
// This sequence follows Jake's revised practice order of 4 October 2026.
window.DORJE_READER_DATA = (() => {
  const content = window.DORJE_DROLO_CONTENT;
  const order = [
    { id: "daily-refuge", title: "Refuge and bodhicitta", group: "Opening chants" },
    { id: "four-immeasurables", title: "Four immeasurables", group: "Opening chants" },
    { id: "kagyu-lineage", title: "Kagyu lineage supplication", group: "Opening chants", optional: true },
    { id: "reflection-one", group: "Six reflections" },
    { id: "reflection-two", group: "Six reflections" },
    { id: "reflection-three", group: "Six reflections" },
    { id: "reflection-four", group: "Six reflections" },
    { id: "reflection-five", group: "Six reflections" },
    { id: "reflection-six", group: "Six reflections" },
    {
      id: "refuge-main",
      title: "Refuge after reflections",
      subtitle: "Dorje Drolö · opening refuge",
      group: "Refuge and bodhicitta",
      pdfPage: 11,
    },
    {
      id: "prostration-short",
      title: "Prostration short refuge",
      subtitle: "Dorje Drolö · short refuge prayer",
      group: "Refuge and bodhicitta",
      pdfPage: 15,
    },
    {
      id: "refuge-second",
      title: "Finish refuge and bodhicitta",
      subtitle: "Dorje Drolö · second refuge and bodhicitta recording",
      group: "Refuge and bodhicitta",
      pdfPage: 16,
    },
    {
      id: "dedication-aspiration",
      title: "Closing dedication",
      subtitle: "Dorje Drolö · dedication and aspiration",
      group: "Closing dedications",
      pdfPage: 61,
    },
    {
      id: "dedication-prayers",
      title: "Daily chant short dedication",
      subtitle: "Tergar daily closing chant",
      group: "Closing dedications",
    },
  ];

  return {
    title: content.source.title,
    subtitle: content.source.subtitle,
    sourcePdf: content.source.file,
    sections: order.map((step) => {
      const track = content.tracks.find((item) => item.id === step.id);
      const transcript = content.transcripts[track.transcript];
      return {
        id: step.id,
        title: step.title || track.title,
        subtitle: step.subtitle || transcript?.subtitle || track.subtitle || "",
        group: step.group,
        optional: Boolean(step.optional),
        recording: track.file,
        duration: track.duration,
        sourcePage: transcript?.sourcePage || "",
        sourcePdf: step.pdfPage ? `${content.source.file}#page=${step.pdfPage}` : null,
        // Four recordings have no verified verse cues in the earlier companion.
        // Keep their source PDF available without inventing text or timings.
        phrases: transcript?.phrases || [],
      };
    }),
  };
})();

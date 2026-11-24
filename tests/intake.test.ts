import { describe, expect, it } from "vitest";
import { classifyTrades, classifyUrgency } from "@/lib/rules/classify";
import { detectEmergency } from "@/lib/rules/emergency";

// Spec §7.1 + §12.2 (rules classifier: the 14 test sentences) — small slice.
describe("rules classifier", () => {
  it("classifies the common problems (§12.1)", () => {
    expect(classifyTrades("geyser se pani tapak raha hai").trade).toBe("plumber");
    expect(classifyTrades("mere bathroom ki nali block ho gayi hai, kal aa sakte hain").trade).toBe("plumber");
    expect(classifyTrades("AC thanda nahi kar raha, abhi chahiye").trade).toBe("ac_fridge");
    expect(classifyTrades("pankha band ho gaya hai").trade).toBe("electrician");
    expect(classifyTrades("darwaze ka lock toot gaya").trade).toBe("carpenter");
    expect(classifyTrades("mazdoor, shifting_help, flexible").trade).toBe("mazdoor");
    expect(classifyTrades("kuch kharab ho gaya hai").trade).toBe("unknown");
  });

  it("detects emergencies (§7.1)", () => {
    expect(detectEmergency("switch se chingari nikal rahi hai").is_emergency).toBe(true);
    expect(detectEmergency("gas ki boo aa rahi hai kitchen mein").is_emergency).toBe(true);
    expect(detectEmergency("mera plan sahi hai").is_emergency).toBe(false);
  });

  it("classifies urgency (§7.1)", () => {
    expect(classifyUrgency("AC thanda nahi kar raha, abhi chahiye")).toBe("now");
    expect(classifyUrgency("meri nali block ho gayi hai, kal aa sakte hain")).toBe("tomorrow");
    expect(classifyUrgency("ac repair karna hai")).toBe("today");
  });
});

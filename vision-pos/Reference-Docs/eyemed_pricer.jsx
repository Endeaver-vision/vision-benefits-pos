import { useState } from "react";

// ─── PRODUCT LIST (from your master price list) ───────────────────────────────
const PRODUCTS = [
  // EXAM SERVICES
  { category: "EXAM SERVICES", name: "Routine Vision Exam", retail: 100, type: "exam" },
  { category: "EXAM SERVICES", name: "Medical Exam", retail: 100, type: "medical_billing" },

  // EXAM ADD-ONS
  { category: "EXAM ADD-ONS", name: "Optomap", retail: 39, type: "retinal_imaging" },
  { category: "EXAM ADD-ONS", name: "iWellness", retail: 19, type: "cash_only" },
  { category: "EXAM ADD-ONS", name: "OCT Retina/ON", retail: 39, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "Visual Field", retail: 39, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "External Photos", retail: 29, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "Neuro HA Screen", retail: 89, type: "cash_only" },
  { category: "EXAM ADD-ONS", name: "Corneal Thickness", retail: 29, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "Myopia Atropine Exam Consult & Follow Up", retail: 350, type: "cash_only" },

  // CONTACT LENS FITTING
  { category: "CONTACT LENS FITTING", name: "Sphere", retail: 75, type: "cl_fit_standard" },
  { category: "CONTACT LENS FITTING", name: "Toric", retail: 100, type: "cl_fit_standard" },
  { category: "CONTACT LENS FITTING", name: "Multifocal Soft Lens", retail: 150, type: "cl_fit_premium" },
  { category: "CONTACT LENS FITTING", name: "Monovision", retail: 120, type: "cl_fit_standard" },
  { category: "CONTACT LENS FITTING", name: "RGP", retail: 350, type: "cl_fit_specialty" },
  { category: "CONTACT LENS FITTING", name: "Specialty CL", retail: 850, type: "cl_fit_specialty" },
  { category: "CONTACT LENS FITTING", name: "Ortho-K", retail: 2200, type: "cl_fit_specialty" },
  { category: "CONTACT LENS FITTING", name: "MiSight Fitting", retail: 1250, type: "cl_fit_specialty" },

  // LENS TYPE
  { category: "LENS TYPE", name: "Neurolens SV", retail: 400, type: "cash_only" },
  { category: "LENS TYPE", name: "Neurolens Progressive", retail: 700, type: "cash_only" },
  { category: "LENS TYPE", name: "Eyezen", retail: 144, type: "lens_sv_premium" },
  { category: "LENS TYPE", name: "FT Bifocal", retail: 182, type: "lens_bifocal" },
  { category: "LENS TYPE", name: "FT Trifocal", retail: 155, type: "lens_trifocal" },
  { category: "LENS TYPE", name: "Single Vision", retail: 96, type: "lens_sv" },
  { category: "LENS TYPE", name: "Varilux Comfort DRx", retail: 280, type: "progressive_tier_3" },
  { category: "LENS TYPE", name: "Varilux Comfort Max", retail: 409, type: "progressive_tier_4" },
  { category: "LENS TYPE", name: "Varilux i", retail: 480, type: "cash_only" },
  { category: "LENS TYPE", name: "Varilux X", retail: 615, type: "progressive_tier_4" },
  { category: "LENS TYPE", name: "Stellest", retail: 500, type: "progressive_tier_4" },
  { category: "LENS TYPE", name: "Sequel Single Vision", retail: 350, type: "cash_only" },
  { category: "LENS TYPE", name: "Sequel Progressive", retail: 536, type: "cash_only" },

  // LENS MATERIAL
  { category: "LENS MATERIAL", name: "Polycarbonate", retail: 65, type: "material_poly" },
  { category: "LENS MATERIAL", name: "1.67 High Index", retail: 130, type: "material_hi" },
  { category: "LENS MATERIAL", name: "1.72 Ultra High Index", retail: 150, type: "material_uhi" },
  { category: "LENS MATERIAL", name: "Trivex", retail: 75, type: "material_trivex" },
  { category: "LENS MATERIAL", name: "CR-39 (base)", retail: 0, type: "material_base" },

  // AR COATINGS
  { category: "AR COATINGS", name: "Neurolens Premium AR", retail: 180, type: "cash_only" },
  { category: "AR COATINGS", name: "Neurolens Blue AR", retail: 180, type: "cash_only" },
  { category: "AR COATINGS", name: "Crizal Sapphire", retail: 187, type: "ar_tier_3" },
  { category: "AR COATINGS", name: "Crizal Rock", retail: 158, type: "ar_tier_3" },
  { category: "AR COATINGS", name: "Crizal EZ Pro", retail: 148, type: "ar_tier_2" },
  { category: "AR COATINGS", name: "Crizal SunShield", retail: 180, type: "ar_tier_2" },

  // TRANSITIONS
  { category: "TRANSITIONS", name: "Transitions Gen S", retail: 160, type: "photochromic" },
  { category: "TRANSITIONS", name: "Transitions XtraActive", retail: 160, type: "photochromic" },

  // POLARIZED
  { category: "POLARIZED", name: "Polarized", retail: 180, type: "polarized" },

  // MOUNT FEE
  { category: "MOUNT FEE", name: "Full Rim", retail: 0, type: "mount_included" },
  { category: "MOUNT FEE", name: "Semi-Rimless", retail: 35, type: "mount_fee" },
  { category: "MOUNT FEE", name: "Rimless", retail: 45, type: "mount_fee" },

  // LENS ADD-ONS
  { category: "LENS ADD-ONS", name: "UV Coating", retail: 16, type: "uv_coating" },
  { category: "LENS ADD-ONS", name: "Mirror", retail: 55, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Tint", retail: 30, type: "tint" },
  { category: "LENS ADD-ONS", name: "Oversize Lenses (61mm+)", retail: 30, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Tech Add-on Single Vision", retail: 10, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Tech Add-on Multifocal", retail: 40, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Prism Per Diopter", retail: 15, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Essential Blue", retail: 40, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Roll and Polish", retail: 30, type: "lens_addon" },
];

// ─── PRICING CALCULATOR ───────────────────────────────────────────────────────
function calcPatientCost(product, benefits) {
  const { type, retail } = product;
  const b = benefits;

  const pct = (val) => (typeof val === "number" ? val : 0);
  const flat = (val) => (typeof val === "number" ? val : null);

  switch (type) {
    case "cash_only":
      return { cost: retail, note: "Cash only — not covered by vision plan" };

    case "medical_billing":
      return { cost: retail, note: "Billed to medical insurance separately" };

    case "exam":
      return { cost: pct(flat(b.exam_copay) ?? retail), note: "Exam copay" };

    case "retinal_imaging":
      return {
        cost: flat(b.retinal_imaging_fee) ?? retail,
        note: "Retinal imaging fee",
      };

    case "cl_fit_standard":
      if (flat(b.cl_fit_standard) !== null) {
        return { cost: b.cl_fit_standard, note: "Standard CL fitting copay" };
      }
      if (b.cl_fit_standard_type === "discount" && b.cl_fit_standard_pct) {
        const cost = retail * (1 - b.cl_fit_standard_pct);
        return { cost, note: `${Math.round(b.cl_fit_standard_pct * 100)}% off retail` };
      }
      return { cost: retail, note: "Check plan for CL fit benefit" };

    case "cl_fit_premium":
      if (flat(b.cl_fit_premium) !== null) {
        return { cost: b.cl_fit_premium, note: "Premium CL fitting copay" };
      }
      if (b.cl_fit_premium_type === "discount" && b.cl_fit_premium_pct) {
        const cost = retail * (1 - b.cl_fit_premium_pct);
        return { cost, note: `${Math.round(b.cl_fit_premium_pct * 100)}% off retail` };
      }
      return { cost: retail, note: "Check plan for premium CL fit benefit" };

    case "cl_fit_specialty":
      return { cost: retail, note: "Specialty CL — verify with plan" };

    case "lens_sv":
    case "lens_sv_premium":
      return { cost: flat(b.lens_sv) ?? retail, note: "Single vision lens copay" };

    case "lens_bifocal":
      return { cost: flat(b.lens_bifocal) ?? retail, note: "Bifocal lens copay" };

    case "lens_trifocal":
      return { cost: flat(b.lens_trifocal) ?? retail, note: "Trifocal lens copay" };

    case "progressive_tier_3": {
      const copay = flat(b.progressive_tier_3) ?? flat(b.progressive_standard) ?? retail;
      return { cost: copay, note: "Progressive Tier 3 copay" };
    }

    case "progressive_tier_4": {
      if (b.progressive_tier_4_type === "copay_plus_overage") {
        const base = flat(b.progressive_tier_4_copay) ?? 0;
        const allowance = flat(b.progressive_tier_4_allowance) ?? 0;
        const discount = pct(b.progressive_tier_4_overage_discount ?? 0.20);
        const overage = Math.max(0, retail - allowance);
        const cost = base + overage * (1 - discount);
        return {
          cost,
          note: `$${base} copay + ${Math.round((1-discount)*100)}% of overage above $${allowance} allowance`,
        };
      }
      const copay = flat(b.progressive_tier_4) ?? retail;
      return { cost: copay, note: "Progressive Tier 4 copay" };
    }

    case "material_poly":
      if (b.poly_free_under_18 && b.patient_age < 18) {
        return { cost: 0, note: "Free — patient under 18" };
      }
      return { cost: flat(b.material_poly) ?? retail, note: "Polycarbonate copay" };

    case "material_hi":
      if (b.material_hi_type === "discount") {
        return {
          cost: retail * (1 - pct(b.material_hi_pct ?? 0.20)),
          note: `${Math.round(pct(b.material_hi_pct ?? 0.20) * 100)}% off retail`,
        };
      }
      return { cost: flat(b.material_hi) ?? retail, note: "1.67 HI copay" };

    case "material_uhi":
      if (b.material_uhi_type === "discount") {
        return {
          cost: retail * (1 - pct(b.material_uhi_pct ?? 0.20)),
          note: `${Math.round(pct(b.material_uhi_pct ?? 0.20) * 100)}% off retail`,
        };
      }
      return { cost: flat(b.material_uhi) ?? retail, note: "1.72 UHI copay" };

    case "material_trivex":
      if (b.material_trivex_type === "discount") {
        return {
          cost: retail * (1 - pct(b.material_trivex_pct ?? 0.20)),
          note: `${Math.round(pct(b.material_trivex_pct ?? 0.20) * 100)}% off retail`,
        };
      }
      return { cost: flat(b.material_trivex) ?? retail, note: "Trivex copay" };

    case "material_base":
      return { cost: 0, note: "Included — base material" };

    case "ar_tier_2": {
      const copay = flat(b.ar_tier_2) ?? flat(b.ar_standard) ?? retail;
      return { cost: copay, note: "AR Tier 2 copay" };
    }

    case "ar_tier_3": {
      const copay = flat(b.ar_tier_3) ?? flat(b.ar_standard) ?? retail;
      return { cost: copay, note: "AR Tier 3 copay" };
    }

    case "photochromic":
      return { cost: flat(b.photochromic) ?? retail, note: "Photochromic copay" };

    case "polarized":
      if (b.polarized_type === "discount") {
        return {
          cost: retail * (1 - pct(b.polarized_pct ?? 0.20)),
          note: `${Math.round(pct(b.polarized_pct ?? 0.20) * 100)}% off retail`,
        };
      }
      return { cost: flat(b.polarized) ?? retail, note: "Polarized copay" };

    case "tint":
      return { cost: flat(b.tint) ?? retail, note: "Tint copay" };

    case "uv_coating":
      if (b.uv_included) return { cost: 0, note: "Included with plan" };
      return { cost: flat(b.uv_coating) ?? retail, note: "UV coating fee" };

    case "mount_included":
      return { cost: 0, note: "Included" };

    case "mount_fee":
      return { cost: retail, note: "Mount fee — patient pays" };

    case "lens_addon":
      if (b.addons_type === "discount") {
        return {
          cost: retail * (1 - pct(b.addons_pct ?? 0.20)),
          note: `${Math.round(pct(b.addons_pct ?? 0.20) * 100)}% off retail`,
        };
      }
      return { cost: flat(b.addons_flat) ?? retail, note: "Lens add-on fee" };

    default:
      return { cost: retail, note: "See plan details" };
  }
}

// ─── EXTRACTION PROMPT ────────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `You are reading an EyeMed vision benefit authorization document.
Extract ALL benefit data and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Extract these exact fields (use null if not found):

{
  "patient_name": "string",
  "patient_dob": "string",
  "patient_age": number,
  "plan_name": "string",
  "member_id": "string",

  "exam_copay": number,
  "retinal_imaging_fee": number,

  "cl_fit_standard": number or null,
  "cl_fit_standard_type": "flat" or "discount",
  "cl_fit_standard_pct": number (0.0-1.0) or null,
  "cl_fit_premium": number or null,
  "cl_fit_premium_type": "flat" or "discount",
  "cl_fit_premium_pct": number (0.0-1.0) or null,

  "frame_allowance": number,
  "frame_overage_discount": number (e.g. 0.20 for 20% off),

  "contacts_allowance": number,
  "contacts_allowance_type": "disposable" or "conventional" or "both",
  "contacts_overage_pct": number (patient pays this % of overage, e.g. 1.0 = 100%),

  "lens_sv": number,
  "lens_bifocal": number,
  "lens_trifocal": number,

  "progressive_standard": number or null,
  "progressive_tier_1": number or null,
  "progressive_tier_2": number or null,
  "progressive_tier_3": number or null,
  "progressive_tier_4": number or null,
  "progressive_tier_4_type": "flat" or "copay_plus_overage",
  "progressive_tier_4_copay": number or null,
  "progressive_tier_4_allowance": number or null,
  "progressive_tier_4_overage_discount": number (e.g. 0.20) or null,
  "progressive_tier_5": number or null,

  "material_poly": number or null,
  "poly_free_under_18": true or false,
  "material_hi": number or null,
  "material_hi_type": "flat" or "discount",
  "material_hi_pct": number or null,
  "material_uhi": number or null,
  "material_uhi_type": "flat" or "discount",
  "material_uhi_pct": number or null,
  "material_trivex": number or null,
  "material_trivex_type": "flat" or "discount",
  "material_trivex_pct": number or null,

  "ar_standard": number or null,
  "ar_tier_1": number or null,
  "ar_tier_2": number or null,
  "ar_tier_3": number or null,

  "photochromic": number or null,

  "polarized": number or null,
  "polarized_type": "flat" or "discount",
  "polarized_pct": number or null,

  "tint": number or null,
  "uv_included": true or false,
  "uv_coating": number or null,

  "addons_flat": number or null,
  "addons_type": "flat" or "discount",
  "addons_pct": number or null
}

For discount fields: if the plan says "20% off retail" set type="discount" and pct=0.20.
For flat copay fields: set the dollar amount directly.
For progressive Tier 4 that shows "$X copay + 20% off overage above $Y allowance": set type="copay_plus_overage".`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function EyeMedPricer() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [benefits, setBenefits] = useState(null);
  const [priceList, setPriceList] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [rawJSON, setRawJSON] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("loading");
    setErrorMsg("");
    setBenefits(null);

    try {
      // Convert PDF to base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("File read failed"));
        r.readAsDataURL(file);
      });

      // Send to Claude
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                },
                { type: "text", text: EXTRACTION_PROMPT },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text ?? "";

      // Parse JSON — strip any accidental markdown fences
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setRawJSON(JSON.stringify(parsed, null, 2));
      setBenefits(parsed);

      // Calculate prices
      const list = PRODUCTS.map(p => {
        const { cost, note } = calcPatientCost(p, parsed);
        return { ...p, patientCost: Math.round(cost * 100) / 100, note };
      });
      setPriceList(list);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  const categories = [...new Set(priceList.map(p => p.category))];
  const fmt = (n) => n === 0 ? "$0.00" : `$${n.toFixed(2)}`;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#F4F6F9", padding: "0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: "#1B3A6B", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#7EB3E8", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Vision Benefit Pricer</div>
          <div style={{ color: "white", fontSize: 22, fontWeight: 700 }}>EyeMed Patient Price List</div>
        </div>
        {benefits && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "white", fontWeight: 600, fontSize: 16 }}>{benefits.patient_name}</div>
            <div style={{ color: "#7EB3E8", fontSize: 13 }}>{benefits.plan_name}</div>
            {benefits.member_id && <div style={{ color: "#7EB3E8", fontSize: 12 }}>ID: {benefits.member_id}</div>}
          </div>
        )}
      </div>

      <div style={{ padding: "32px 40px" }}>

        {/* UPLOAD */}
        {status === "idle" && (
          <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
            <div style={{ background: "white", borderRadius: 16, padding: "48px 40px", border: "2px dashed #C5D5E8", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#1B3A6B", marginBottom: 8 }}>Upload EyeMed Authorization</div>
              <div style={{ fontSize: 14, color: "#6B7A8D", marginBottom: 28 }}>Upload the patient's EyeMed benefit PDF to generate their personalized price list</div>
              <label style={{ cursor: "pointer" }}>
                <input type="file" accept=".pdf" onChange={handleFile} style={{ display: "none" }} />
                <div style={{ background: "#1B3A6B", color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 600, fontSize: 15, display: "inline-block" }}>
                  Choose PDF File
                </div>
              </label>
            </div>
          </div>
        )}

        {/* LOADING */}
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16, animation: "spin 1.5s linear infinite", display: "inline-block" }}>⚙️</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1B3A6B" }}>Reading benefit document…</div>
            <div style={{ fontSize: 14, color: "#6B7A8D", marginTop: 8 }}>Extracting plan data and calculating patient costs</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ERROR */}
        {status === "error" && (
          <div style={{ maxWidth: 500, margin: "60px auto", background: "#FFF0F0", border: "1px solid #FFB3B3", borderRadius: 12, padding: 24 }}>
            <div style={{ fontWeight: 600, color: "#C00", marginBottom: 8 }}>Error reading document</div>
            <div style={{ fontSize: 13, color: "#666" }}>{errorMsg}</div>
            <button onClick={() => setStatus("idle")} style={{ marginTop: 16, background: "#1B3A6B", color: "white", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Try Again</button>
          </div>
        )}

        {/* RESULTS */}
        {status === "done" && (
          <>
            {/* Benefit summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { label: "Exam Copay", value: fmt(benefits.exam_copay ?? 0) },
                { label: "Frame Allowance", value: benefits.frame_allowance ? `$${benefits.frame_allowance}` : "—" },
                { label: "CL Allowance", value: benefits.contacts_allowance ? `$${benefits.contacts_allowance}` : "—" },
                { label: "CL Fit (Standard)", value: benefits.cl_fit_standard != null ? fmt(benefits.cl_fit_standard) : (benefits.cl_fit_standard_type === "discount" ? `${Math.round((benefits.cl_fit_standard_pct??0.1)*100)}% off` : "—") },
                { label: "Std Lens Copay", value: fmt(benefits.lens_sv ?? 0) },
                { label: "Prog Standard", value: benefits.progressive_standard != null ? fmt(benefits.progressive_standard) : "—" },
              ].map(c => (
                <div key={c.label} style={{ background: "white", borderRadius: 10, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 11, color: "#6B7A8D", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{c.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1B3A6B", marginTop: 4 }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Price table */}
            <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1B3A6B" }}>
                    <th style={{ padding: "12px 20px", textAlign: "left", color: "white", fontWeight: 600, letterSpacing: 0.5 }}>Product</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "white", fontWeight: 600 }}>Retail</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "white", fontWeight: 600 }}>Patient Cost</th>
                    <th style={{ padding: "12px 20px", textAlign: "left", color: "#7EB3E8", fontWeight: 500 }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, ci) => {
                    const rows = priceList.filter(p => p.category === cat);
                    return [
                      <tr key={`cat-${cat}`}>
                        <td colSpan={4} style={{ padding: "10px 20px 6px", background: ci % 2 === 0 ? "#EEF3FA" : "#F7F9FC", fontWeight: 700, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#2E6CA4", borderTop: "2px solid #DDE8F5" }}>
                          {cat}
                        </td>
                      </tr>,
                      ...rows.map((p, ri) => (
                        <tr key={p.name} style={{ background: ri % 2 === 0 ? "white" : "#FAFBFD" }}>
                          <td style={{ padding: "9px 20px", color: "#1A1A2E", fontWeight: p.type === "cash_only" ? 600 : 400, color: p.type === "cash_only" ? "#CC0000" : "#1A1A2E" }}>{p.name}</td>
                          <td style={{ padding: "9px 16px", textAlign: "right", color: "#6B7A8D" }}>{fmt(p.retail)}</td>
                          <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 700, color: p.type === "cash_only" ? "#CC0000" : "#1B3A6B" }}>{fmt(p.patientCost)}</td>
                          <td style={{ padding: "9px 20px", color: "#6B7A8D", fontStyle: "italic", fontSize: 12 }}>{p.note}</td>
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer actions */}
            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { setStatus("idle"); setBenefits(null); setPriceList([]); }}
                style={{ background: "white", border: "1px solid #C5D5E8", color: "#1B3A6B", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                ← New Patient
              </button>
              <button onClick={() => setShowRaw(!showRaw)}
                style={{ background: "none", border: "none", color: "#6B7A8D", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
                {showRaw ? "Hide" : "Show"} extracted benefit data
              </button>
            </div>

            {showRaw && (
              <pre style={{ marginTop: 16, background: "#1A1A2E", color: "#7EB3E8", padding: 20, borderRadius: 10, fontSize: 11, fontFamily: "'DM Mono', monospace", overflow: "auto", maxHeight: 400 }}>
                {rawJSON}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}

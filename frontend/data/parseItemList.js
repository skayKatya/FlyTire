const rawText = `
185/60 R15 88T Roadstone WinGuard Ice Plus WH43 (ck) (шт.)
195/50 R15 82H Orium Winter (сk) (шт.)
195/55 R15 85H Orium Winter (сk) (шт.)
195/65 R15 91Q Roadstone Winguard Ice (ck) (шт.)
195/55 R16 87H Orium Winter (ck) (шт.)
195/75 R16C 107/105R Nordexx WinterSafe Van 2 (vit) (шт.)
205/55 R16 91H WestLake SW608 (vit) (шт.)
205/55 R16 94T Roadstone Winguard WinSpike (ck) (шт.)
205/60 R16 92T Roadstone Winguard WinSpike (ck) (шт.)
205/60 R16 92T WestLake ZuperSnow Z-507 (ck) (шт.)
205/75 R16C 110/108R Kleber Trans Alp 2 (ck) (шт.)
215/55 R16 97T Haida HD 687 (ck) (шт.)
215/60 R16 95Q Roadstone Winguard Ice  (ck) (шт.)
215/60 R16 99H Sunfull SF-982 (ck) (шт.)
235/65 R16C 115/113R Starmaxx Prowin ST960 (vit) (шт.)
245/70 R16 111T Atlander LanderStuds ATL78 (vit) (шт.)
245/75 R16 120/116S SunFull Mont-Pro W781 (vit) (шт.)
265/70 R16 112T Sunfull SF-W11 (vit) (шт.)
275/70 R16 1124T Sunfull SF-W11 (pd) (шт.)
205/50 R17 93V Orium Winter (ck) (шт.)
215/55 R17 94Q Roadstone WinGuard Ice  (vit) (шт.)
225/50 R17 94T Westlake SW628 (ck) (шт.)
225/50 R17 98V Orium Winter (ck) (шт.)
225/50 R17 98V Viking WinTech FR (ck) (шт.)
225/55 R17 101T Roadstone WinGuard ice Plus WH43 (ck) (шт.)
235/65 R17 108H Roadstone Winguard SUV (pd) (шт.)
235/65 R17 108H WestLake SW608 Snowmaster (pd) (шт.)
265/65 R17 112T Atlander Winter AX38 (pd) (шт.)
265/65 R17 112T Atlander Winter AX38 (vit) (шт.)
215/55 R18 95T Atlander LanderStuds ATL78 (vit) (шт.)
225/40 R18 92R Triangle Trin PL01 (ck) (шт.)
225/45 R18 95V Viking WinTech FR (ck) (шт.)
225/50R18 95H Sunfull Mont-Pro WP882 (ck) (шт.)
225/60 R18 100H Sunfull Mont-Pro WP882 (pd) (шт.)
225/60 R18 104V Dunlop Winter Sport 5 SUV (pd) (шт.)
225/60R18 104T Haida HD 687 (pd) (шт.)
235/50 R18 97T Roadstone WinGuard ice Plus WH43 (ck) (шт.)
235/60 R18 103Q Roadstone Winguard Ice SUV (vit) (шт.)
235/60 R18 107V  Warrior Wasp-Plus (pd) (шт.)
235/65 R18 106T Atlander Winter AX38 (vit) (шт.)
245/45 R18 100V Gislaved Euro Frost 6 (vit) (шт.)
265/60 R18 110R Bridgestone Blizzak DM-V3 (pd) (шт.)
155/70 R19 88TT Fulda Kristall Control HP2 (ck) (шт.)
225/45 R19 96V Triangle Snowlink PL02 (ck) (шт.)
235/40 R19 96T Goodyear UltraGrip Ice 2 + (ck) (шт.)
235/45 R19 99V Triangle Snowlink PL02 (ck) (шт.)
245/40 R19 98V Sonix Winter Xpro 999 (vit) (шт.)
245/55 R19 103Q Yokohama Ice Guard G075 (pd) (шт.)
245/55 R19 103T Atlander Winter AX38 (pd) (шт.)
255/35 R19 96V Triangle Snowlink PL02 (vit) (шт.)
255/55 R19 111H WestLake ZuperSnow Z-507 (pd) (шт.)
275/35 R19 100V Sonix Winter Xpro 999 (vit) (шт.)
255/35 R20 97W Davanti Wintoura+(DEMO) (vit) (шт.)
275/40 R20 102T Atlander LanderStuds ATL78 (pd) (шт.)
285/50 R20 116T Roadstone Winguard Ice SUV (pd) (шт.)
315/35 R20 106T Atlander LanderStuds ATL78 (pd) (шт.)
275/40 R21 107W Yokohama BluEarth Winter V906 (pd) (шт.)
275/45 R21 110Q Yokohama Ice Guard G0-75 (pd) (шт.)
295/35 R21 107H Sonix Winter Xpro 999 (pd) (шт.)
285/40 R22 110W Yokohama Bluearth Winter V906 (pd) (шт.)
325/35 R22 114W Yokohama Bluearth Winter V906 (pd) (шт.)
`;

function detectSeason(text) {
  const t = text.toLowerCase();
  if (t.includes("winter") || t.includes("ice") || t.includes("snow")) {
    return "winter";
  }
  if (t.includes("allseason") || t.includes("all season")) {
    return "all-season";
  }
  return "summer";
}

function parseTires(text) {
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.match(/\d{3}\/\d{2}\sR\d{2}/))
    .map(line => {
      const sizeMatch = line.match(/(\d{3})\/(\d{2})\sR(\d{2})/);
      const loadIndexMatch = line.match(/R\d{2}\s([0-9A-Z\/]+)/);

      const cleaned = line
        .replace(/\(.*?\)/g, "")
        .replace(sizeMatch[0], "")
        .replace(loadIndexMatch?.[0] || "", "")
        .trim();

      const parts = cleaned.split(" ");
      const brand = parts.shift();
      const model = parts.join(" ");

      return {
        brand,
        model,
        width: Number(sizeMatch[1]),
        profile: Number(sizeMatch[2]),
        radius: Number(sizeMatch[3]),
        loadIndex: loadIndexMatch ? loadIndexMatch[1] : "",
        season: detectSeason(line),
        price: 0,
        stock: 0,
        basement: 0,
        showroom: 4,
        amount: 0,
        image: "./images/default-tire.jpg"
      };
    });
}


const tires = parseTires(rawText);
console.log(tires);



import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Patch

OUT = sys.argv[1]

# id: (name, dates, detail, line, unconfirmed)
P = {
    "liam":      ("Liam M. Pek", "", "you", "root", False),
    "hengky":    ('Hengky "Hank" Gunawan Pek', "b. 1960 · Padang", "sister: Susy (b. 1961)", "pek", False),
    "kristen":   ("Kristen A. Von Koschembahr", "1966 – 2016", "brother: Gregory (1968–1999)", "kosch", False),
    "lengkim":   ("Pek Leng Kim", "b. 7 Feb 1930", "Iskandar Gunawan · b. Padang", "pek", False),
    "pekho":     ("Pek Ho", "", "came from China aged 18–21", "pek", False),
    "tjiakn":    ("Tjia Kim Nio", "", "", "other", False),
    "pekmom":    ("Sukmawati Gunawan", "1932 – 2004", "born Tjoa Tjie Hong · Padang", "other", False),
    "tjoaF":     ("Ke K. Tjoa", "b. 16 May 1901", "Padang", "other", False),
    "angM":      ("Ang Kheng Eng", "b. 13 Jul 1903", "Padang", "other", False),
    "alex":      ('Alexander "Alex" Von Koschembahr', "1946 – 2009", "b. Burgsteinfurt · to New York 1949", "nemir", False),
    "jeanne":    ('Jeanne "Jeane" McLellan', "1946 – 2019", "b. Boston · brother: John L. (1943–2013)", "mcl", False),
    "george":    ("George Von Koschembahr", "1921 – 1996", "born Georg v. Nemirowitsch-Dantschenko", "nemir", False),
    "georgij":   ("Georgij Nemirovič-Dančenko", "1889 – 1939", "b. St. Petersburg · d. Tallinn", "nemir", True),
    "vladimir":  ("Vladimir P. Nemirovič-Dančenko", "1854? – 1896", "lt. colonel · d. St. Petersburg", "nemir", False),
    "junge":     ("Ekaterina V. Junge", "1864 – 1922", "d. Petrograd · Riga-German family", "junge", False),
    "prokofij":  ("Prokofij V. Nemirovič-Dančenko", "b. c.1813", "colonel", "nemir", False),
    "kalinina":  ("Alexandra I. Kalinina", "", "dau. of a Don Cossack colonel", "other", True),
    "vasilyp":   ("Vasily P. Nemirovič-Dančenko", "b. 1773", "cornet", "nemir", True),
    "prokop":    ("Prokop I. Nemirovič-Dančenko", "d. before 1784", "Cossack officer", "nemir", True),
    "vasjunge":  ("Vasily A. Junge", "1830 – 1897", "b. Riga · d. St. Petersburg", "junge", False),
    "andresen":  ("Agnes C. E. F. Andresen", "1842 – after 1914", "lived Gatchina", "other", False),
    "jhjunge":   ("Johann Heinrich Junge", "c.1802 – c.1838", "farm tenant · m. Riga 1823", "junge", True),
    "heidel":    ("Gertrude W. Heidel", "b. 1802", "b. Riga", "other", True),
    "mheidel":   ("Johann Melchior Heidel", "b. c.1770", "tanner, Riga", "other", True),
    "michaelis": ("Anna Christina Michaelis", "b. c.1770", "Riga", "other", True),
    "udyan":     ("Vladimir Udyanovsky", "", "provincial secretary", "ulj", True),
    "annamaria": ('Anna Maria "Ann Marie" Wessels', "1924 – 2002", "b. Burgsteinfurt, Germany", "wes", False),
    "alexmcl":   ("Alexander McLellan", "c.1910 – 1982?", "b. Glasgow · to Boston 1911", "mcl", False),
    "kathleen":  ("Kathleen P. Lyons", "1914? – 1987?", "b. Boston", "lyons", False),
    "lawrence":  ("Lawrence F. Lyons", "b. 20 Mar 1884", "b. Buggans, Co. Galway · to Boston 1908", "lyons", False),
    "ellen":     ("Ellen Connell", "b. c.1886", "b. Milltown, Co. Galway · to US 1904", "conn", False),
    "patrick":   ("Patrick \"Patt\" Lyons", "b. 1839", "farmer, Buggans, Co. Galway", "lyons", False),
    "naughton":  ("Mary Naughton", "b. c.1844", "m. 1871, Ballygar · Co. Galway", "other", False),
    "jamesl":    ("James Lyons", "", "farmer, Killian parish", "lyons", False),
    "michaeln":  ("Thomas Naughton", "", "Killian parish (civil reg.: Michael)", "other", False),
    "anneb":     ("Anne Burke", "", "Killian parish", "other", False),
    "mulligan":  ("Mary Mulligan", "", "Killian parish", "other", False),
    "johnc":     ("John Connell", "b. c.1853", "Dalgin, Milltown · m. 1882, Tuam", "conn", False),
    "kileen":    ("Mary Killeen", "b. c.1860", "Co. Galway", "other", False),
    "nelliec":   ("Nellie Connell", "b. c.1821", "in son John's household, 1901", "conn", True),
    "frederick": ("Frederick W. Von Koschembahr", "1889 – 1963", "STEPFATHER (m. Anna 1929) · born Bruck ★", "bruck", False),
    "annaF":     ("Anna V. Udyanovskaya", "1895 – 1982", "b. Kharkiv · d. York Co., Maine", "ulj", False),
    "august":    ("August Wessels", "", "", "wes", False),
    "elsen":     ("Anna M. Elsen", "", "", "wes", False),
    "gordon":    ("Gordon McLellan", "1883 – 1952", "b. Glasgow · iron worker", "mcl", False),
    "magdalene": ("Magdalene K. Pettigrew", "1883 – 1953", "b. Camlachie, Glasgow", "pett", False),
    "alexsr":    ("Alexander McLellan", "c.1842 – bef. 1921", "b. Maybole, Ayrshire · weaver", "mcl", False),
    "elizabeth": ("Elizabeth Gordon", "b. c.1842", "b. Girvan, Ayrshire", "other", False),
    "archibald": ("Archibald K. Pettigrew", "1855 – 1931", "b. Glasgow · hoistman", "pett", False),
    "sarah":     ("Sarah Nixon", "1856 – 1944", "b. Girvan, Ayrshire", "other", False),
    "johnmcl":   ("John McLellan", "c.1821 – 1872", "pattern weaver · m. Maybole 1840", "mcl", False),
    "morrison":  ("Margaret Morrison", "", "m. 31 Dec 1840, Maybole", "other", False),
    "wgordon":   ("William Gordon", "c.1788 – 1871", "cotton weaver, Girvan", "other", True),
    "jsmith":    ("Janet (Jean) Smith", "", "Girvan", "other", False),
    "alexmcc":   ("Alexander McClellan", "b. c.1780s", "Girvan · perhaps from Ireland", "mcl", False),
    "susanna":   ("Susanna Shaw", "bap. 14 Dec 1779", "Girvan", "other", False),
    "jamesg":    ("James Gordon", "", "", "other", True),
    "mccracken": ("Margaret McCracken", "", "", "other", True),
    "davidsh":   ("David Shaw", "bap. 2 Mar 1746", "Straiton · later Girvan", "other", True),
    "annmcq":    ("Ann McQueen", "bap. 12 Feb 1749", "Straiton", "other", True),
    "davidsh1":  ("David Shaw", "m. 1739, Barr", "Straiton", "other", True),
    "agnesf":    ("Agnes Ferguson", "", "Barr / Straiton", "other", True),
    "thomasmcq": ("Thomas McQueen", "", "Straiton", "other", True),
    "margf":     ("Margaret Ferguson", "", "Straiton", "other", True),
    "wpett":     ("William Pettigrew", "b. 1827?", "m. 1851, Gorbals · Glasgow, Ayr", "pett", False),
    "wpettsr":   ("William Pettigrew", "1803 – 1864", "shoemaker, Ayr", "pett", True),
    "ekennedy":  ("Elizabeth Kennedy", "", "Ayr", "other", True),
    "johnpett":  ("John Pettigrew", "b. c.1774", "St Quivox, Ayr", "pett", False),
    "edownie":   ("Elizabeth Downie", "", "m. 1795, Newton-on-Ayr", "other", False),
    "mconomy":   ("Margaret McOnomy", "", "prob. Ulster-born", "other", False),
    "wnixon":    ("William Nixon", "c.1823 – 1886", "b. Ireland · weaver, Girvan", "other", False),
    "stead":     ("Isabella Stead", "1825 – 1861", "b. Girvan · m. 1849", "other", False),
    "jstead":    ("John Stead", "", "Girvan · prob. from Co. Antrim", "other", False),
    "mcwhinnie": ("Jean McWhinnie", "", "Girvan", "other", False),
    "wilhelm":   ("Wilhelm Bruck", "1849 – 1907", "b. Ratibor · Justizrat, Berlin", "bruck", False),
    "mathilde":  ("Mathilde M. von Koschembahr", "1860 – 1946", "b. Lissa (Posen) · d. Boston", "kosch", False),
    "leopold":   ("Leopold von Koschembahr", "1829 – 1874", "Kesselbach, Silesia", "kosch", False),
    "amalie":    ("Amalie Mockrauer", "1834 – 1914", "", "other", False),
    "julius":    ("Julius F. L. von Koschembahr", "1799 – 1851", "auf Gross Wilkau, Silesia", "kosch", True),
    "hengel":    ("Friederike M. A. von Hengel", "d. 1845", "", "other", True),
    "ernst":     ("Ernst L. G. von Koschembahr", "1769 – 1843", "d. Breslau", "kosch", True),
    "sophie":    ("Sophie v. Oppeln-Bronikowski", "1779 – 1853", "", "other", True),
}

PARENTS = {
    "liam": ["hengky", "kristen"],
    "hengky": ["lengkim", "pekmom"],
    "lengkim": ["pekho", "tjiakn"],
    "pekmom": ["tjoaF", "angM"],
    "kristen": ["alex", "jeanne"],
    "alex": ["george", "annamaria"],
    "jeanne": ["alexmcl", "kathleen"],
    "george": ["frederick", "georgij", "annaF"],
    "annamaria": ["august", "elsen"],
    "alexmcl": ["gordon", "magdalene"],
    "georgij": ["vladimir", "junge"],
    "gordon": ["alexsr", "elizabeth"],
    "magdalene": ["archibald", "sarah"],
    "alexsr": ["johnmcl", "morrison"],
    "elizabeth": ["wgordon", "jsmith"],
    "johnmcl": ["alexmcc", "susanna"],
    "susanna": ["davidsh", "annmcq"],
    "davidsh": ["davidsh1", "agnesf"],
    "annmcq": ["thomasmcq", "margf"],
    "wgordon": ["jamesg", "mccracken"],
    "archibald": ["wpett", "mconomy"],
    "wpett": ["wpettsr", "ekennedy"],
    "wpettsr": ["johnpett", "edownie"],
    "sarah": ["wnixon", "stead"],
    "kathleen": ["lawrence", "ellen"],
    "lawrence": ["patrick", "naughton"],
    "patrick": ["jamesl", "anneb"],
    "naughton": ["michaeln", "mulligan"],
    "stead": ["jstead", "mcwhinnie"],
    "ellen": ["johnc", "kileen"],
    "johnc": ["nelliec"],
    "vladimir": ["prokofij", "kalinina"],
    "prokofij": ["vasilyp"],
    "vasilyp": ["prokop"],
    "junge": ["vasjunge", "andresen"],
    "vasjunge": ["jhjunge", "heidel"],
    "heidel": ["mheidel", "michaelis"],
    "annaF": ["udyan"],
    "frederick": ["wilhelm", "mathilde"],
    "mathilde": ["leopold", "amalie"],
    "leopold": ["julius", "hengel"],
    "julius": ["ernst", "sophie"],
}
STEP = {("george", "frederick")}

COLORS = {
    "root":  ("#FFF4C2", "#B8860B"),
    "pek":   ("#FBE0E0", "#B03A2E"),
    "kosch": ("#DCE8F7", "#2E5C9A"),
    "bruck": ("#D6F0EB", "#1F7A6D"),
    "wes":   ("#FBE9D3", "#B8702A"),
    "mcl":   ("#E0F1DB", "#3C7D33"),
    "lyons": ("#EFF0D2", "#7A7F2A"),
    "other": ("#ECE8F4", "#6B5B95"),
    "nemir": ("#F6E1EF", "#9B3D7A"),
    "pett":  ("#DDF0F6", "#2A7891"),
    "ulj":   ("#FDF0D9", "#A0662A"),
    "conn":  ("#E3EEE0", "#4F7A43"),
    "junge": ("#E8EEF3", "#4A6378"),
}
LINE_NAMES = {
    "pek": "Pek (Indonesia)", "nemir": "Nemirovich-Danchenko (St. Petersburg)", "ulj": "Udyanovsky (Kharkiv)", "junge": "Junge (Riga / St. Petersburg)",
    "kosch": "von Koschembahr (Silesia, step-line)", "bruck": "Bruck (Berlin, step-line)",
    "wes": "Wessels (Westphalia)", "mcl": "McLellan (Glasgow)", "pett": "Pettigrew (Glasgow)",
    "lyons": "Lyons (Ireland)", "conn": "Connell (Ireland)", "other": "Other married-in lines",
}

# ---- layout: generation = column, leaves get sequential slots, parents' mean otherwise
gen, ypos = {}, {}
slot = [0]

def place(pid, g):
    gen[pid] = g
    ps = PARENTS.get(pid, [])
    if not ps:
        ypos[pid] = slot[0]
        slot[0] += 1
    else:
        for p in ps:
            place(p, g + 1)
        bio = [p for p in ps if (pid, p) not in STEP]
        ypos[pid] = sum(ypos[p] for p in bio) / len(bio)

place("liam", 0)
n_slots = slot[0]
n_gen = max(gen.values()) + 1

BW, BH, COLW, ROWH = 4.0, 0.84, 4.5, 1.0
X = lambda g: g * COLW
Y = lambda s: -s * ROWH

fig_w = n_gen * COLW + 0.6
fig_h = n_slots * ROWH + 3.2
fig, ax = plt.subplots(figsize=(fig_w * 0.78, fig_h * 0.78), dpi=150)
ax.set_xlim(-0.4, n_gen * COLW - (COLW - BW) + 0.4)
ax.set_ylim(Y(n_slots) - 0.9, 1.75)
ax.axis("off")
fig.patch.set_facecolor("white")

# connectors
for child, ps in PARENTS.items():
    cx = X(gen[child]) + BW
    cy = Y(ypos[child])
    mid = cx + (COLW - BW) / 2
    bio = [p for p in ps if (child, p) not in STEP]
    ys = [Y(ypos[p]) for p in bio]
    ax.plot([cx, mid], [cy, cy], color="#8A8F98", lw=1.1, zorder=1)
    ax.plot([mid, mid], [min(ys + [cy]), max(ys + [cy])], color="#8A8F98", lw=1.1, zorder=1)
    for p in bio:
        ax.plot([mid, X(gen[p])], [Y(ypos[p])] * 2, color="#8A8F98", lw=1.1, zorder=1)
    for p in ps:
        if (child, p) in STEP:
            sx, py = mid - 0.12, Y(ypos[p])
            ax.plot([cx, sx, sx, X(gen[p])], [cy, cy, py, py], color="#1F7A6D", lw=1.4,
                    ls=(0, (1.5, 2)), zorder=1)
            ax.text(sx + 0.08, (cy + py) / 2, "stepfather", rotation=90, fontsize=7.5,
                    color="#1F7A6D", ha="left", va="center", style="italic")

# boxes
for pid, (name, dates, detail, line, unconf) in P.items():
    x, y = X(gen[pid]), Y(ypos[pid])
    fill, edge = COLORS[line]
    box = FancyBboxPatch((x, y - BH / 2), BW, BH, boxstyle="round,pad=0,rounding_size=0.12",
                         fc=fill, ec=edge, lw=1.6 if pid == "liam" else 1.2,
                         ls=(0, (4, 2.5)) if unconf else "-", zorder=2)
    ax.add_patch(box)
    lines = [(name, 8.6, "bold", "#1D232B")]
    if dates:
        lines.append((dates, 7.8, "normal", "#2F3A45"))
    if detail:
        lines.append((detail, 6.9, "normal", "#56616D"))
    step = 0.21
    top = y + step * (len(lines) - 1) / 2
    for i, (t, fs, fw, col) in enumerate(lines):
        ax.text(x + BW / 2, top - i * step, t, ha="center", va="center", fontsize=fs,
                fontweight=fw, color=col, zorder=3)

# generation headers
heads = ["You", "Parents", "Grandparents", "Great-\ngrandparents", "2× great-", "3× great-",
         "4× great-", "5× great-", "6× great-", "7× great-"]
for g in range(n_gen):
    ax.text(X(g) + BW / 2, 0.95, heads[g], ha="center", va="center", fontsize=8.5,
            color="#56616D", fontweight="bold")

# title
ax.text(-0.3, 1.6, "Family Tree — Pek · Von Koschembahr · McLellan", fontsize=17,
        fontweight="bold", color="#1D232B", va="center")

# 1938 branch note (empty lower-right area)
nx, ny = X(5.75), 0.45
note = ("Step-line: Frederick's 1941 naturalization papers list George as\n"
        "his stepson, \"Georg von Nemirowitsch-Dantschenko\", born Munich\n"
        "6 Oct 1921. The Bruck / von Koschembahr ancestors (teal & blue,\n"
        "upper right) are step-family; the surname came via Anna's 1929\n"
        "marriage to Frederick.\n\n"
        "★  The 1938 branch: Frederick's older brother Gerhard (Bruck) von\n"
        "Koschembahr (1885–1961) married Baroness Hilda von Zedlitz und\n"
        "Neukirch; with ten of their 13 children they reached New York on\n"
        "the SS Paris, 1 Oct 1938.")
ax.text(nx, ny, note, fontsize=8.2, va="top", ha="left", color="#1D232B", linespacing=1.45,
        bbox=dict(boxstyle="round,pad=0.6", fc="#F7F9FC", ec="#2E5C9A", lw=1.1))

# legend
handles = [Patch(fc=COLORS[k][0], ec=COLORS[k][1], label=v) for k, v in LINE_NAMES.items()]
handles.append(Patch(fc="white", ec="#56616D", ls=(0, (4, 2.5)), label="Dashed box = probable or unverified"))
from matplotlib.lines import Line2D
handles.append(Line2D([0], [0], color="#1F7A6D", lw=1.4, ls=(0, (1.5, 2)), label="Dotted line = step-parent"))
ax.legend(handles=handles, loc="lower left", bbox_to_anchor=(0.0, -0.005), ncol=4, fontsize=8,
          frameon=False, handlelength=1.6, columnspacing=1.6)
ax.text(n_gen * COLW - (COLW - BW) + 0.3, Y(n_slots) - 0.8,
        "Sources: FamilySearch records & Family Tree, Bruck family research. Compiled 19 Nov 2026.",
        fontsize=7, color="#8A8F98", ha="right", va="bottom")

fig.savefig(OUT, bbox_inches="tight", facecolor="white")
print("saved", OUT)

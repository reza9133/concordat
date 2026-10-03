# Concordat

A community rulebook enforced by GenLayer Intelligent Contracts.

Members file complaints about rules, validators rule on them by reading the
evidence, and the losing side can appeal to a second, stricter review. Every
outcome feeds back into each member's standing. Three contracts are chained
together and only the first one is deployed by hand.

```
  you deploy this once
        |
  ConcordatHall  ---- file_case() ---->  ConcordatCase  ---- appeal() ---->  ConcordatAppeal
  rulebook, standings   (deploys one      one complaint,    (deploys one      reviews the first
  and the case          case per          one rule,         appeal when the   ruling with
  registry              complaint)        first ruling      loser appeals)    deference
        ^                                      |                                   |
        |                                      |                                   |
        +------ report_final(violation, sev) --+<-- receive_appeal_result() -------+
                 (internal message,                   (internal message,
                  sent on finalization)                sent on finalization)
```

## How it works

1. **Deploy the hall** with a community name, standing thresholds and two time
   windows. The owner adds rules to the rulebook.
2. **Anyone files a case** with `file_case(accused, rule_number, complaint_url)`.
   The hall deploys a new `ConcordatCase` contract at its own address and
   records it. The rule text is copied into the case at that moment, so later
   rulebook edits never change a case that is already open.
3. **Defense window.** The accused may submit one defense URL. The ruling can
   be requested as soon as a defense exists, or once the window has passed.
4. **First-instance ruling.** `request_ruling()` makes the leader fetch the
   complaint and defense pages and ask an LLM for a structured verdict
   (violation yes/no, severity 0-3). Validators repeat the review and accept
   only if they reach the same yes/no verdict and a severity within one step.
5. **Appeal window.** Only the losing party may appeal: the accused if a
   violation was found, the complainant if the complaint was dismissed.
   `appeal(grounds_url)` makes the case deploy a `ConcordatAppeal`.
6. **Appeal review.** `ConcordatAppeal.review()` uses a *deference* standard:
   the first ruling stands unless the grounds and evidence clearly show a
   mistake. When the ruling is sound the verdict is pinned to the first one,
   so validators only have to agree on the deference call itself.
7. **Dead links cannot freeze a case.** A defense or appeal-grounds page that
   cannot be fetched is treated as "not provided": the ruling goes ahead without
   the defense, and an appeal without readable grounds leaves the first ruling
   standing. If an appeal still produces no result within one appeal window
   (for example the complaint page died), anyone can call `abandon_appeal()` and
   the case closes with the first ruling. `abandon_appeal()` refuses to run once
   the appeal review has already been decided: that result is only waiting for
   its finalization message and must not be thrown away. An unreadable
   *complaint* page still makes the ruling fail and can be retried; it blocks
   only the complainant.
   **Evidence is pinned.** The ruling stores a hash of the complaint and defense
   pages it read. If either page has changed (or died) by the time of an appeal,
   the first ruling stands instead of being re-judged on edited material.
8. **Outcome.** If nobody appeals, anyone can call `finalize()` after the
   window. Either way the case sends `report_final` to the hall, which updates
   standings:
   - violation upheld: the accused gains points equal to the severity
   - complaint dismissed: the complainant gains one dismissed complaint
   - `probation` and `suspended` labels follow the point thresholds
   - suspended members, and members with too many dismissed complaints, cannot
     file new cases; the owner can grant amnesty with `forgive_points`
   - a member can have at most `max_dismissed_complaints` unsettled cases open
     at once, so the lockout cannot be dodged by filing a swarm of cases first

## Why the contracts can trust each other

- **Hall -> Case:** the case stores `gl.message.sender_address` from its
  constructor. Only the hall can have deployed it, so that address is the
  only one it ever reports to.
- **Case -> Hall:** the hall records the address returned by
  `gl.deploy_contract` for every case it creates. `report_final` rejects any
  sender that is not in that registry, so an outsider cannot fabricate an
  outcome.
- **Appeal -> Case:** the case stores the address of the appeal it deployed and
  accepts `receive_appeal_result` only from it, and only while it is in the
  `under_appeal` state.
- All state changes that depend on LLM or web data happen after consensus, on
  the agreed value. Outcomes travel between contracts with `on="finalized"`
  messages, so a result that is later overturned is never acted on.

## Project layout

```
contracts/
  concordat_hall.py      GENERATED - the only file you deploy
  concordat_case.py      GENERATED - embeds the appeal contract
  concordat_appeal.py    hand-written leaf contract
templates/
  concordat_hall.tpl.py  hall source, with an embed slot for the case
  concordat_case.tpl.py  case source, with an embed slot for the appeal
scripts/build.py         regenerates the two GENERATED files
tests/                   direct-mode tests (no network, no Docker)
```

A contract can only deploy another contract from its source code, and a
deployed contract has no filesystem. So each parent embeds its child's full
source as a base64 constant. `scripts/build.py` produces that embedding in
dependency order (appeal into case, case into hall). After editing any
contract or template, run:

```bash
python3 scripts/build.py          # regenerate
python3 scripts/build.py --check  # exit 1 if generated files are stale
```

`tests/test_build_in_sync.py` fails if you forget.

## Setup

```bash
pip install -r requirements.txt
genvm-lint check contracts/concordat_hall.py
pytest tests -v
```

The tests run every contract in-process with the direct runner. The direct
runner does not execute cross-contract calls, so the tests record each deploy
and each internal message, assert on their exact contents, and then call the
receiving contract while pranking as the sender the protocol would supply.
They also check that the code a parent deploys is byte-for-byte the child
contract file.

If the runner cannot pick an SDK release automatically, pin one:

```bash
CONCORDAT_SDK_VERSION=v0.2.16 pytest tests -v
```

## Deploy on Studionet

### Option A: GenLayer CLI

```bash
npm install -g genlayer
genlayer network set studionet

# 1. Deploy the hall. Arguments, in order:
#    community, probation_points, suspension_points,
#    max_dismissed_complaints, defense_window_seconds, appeal_window_seconds
genlayer deploy --contract contracts/concordat_hall.py \
  --args "Open Garden" 5 10 3 86400 86400
```

Copy the hall address from the output, then:

```bash
HALL=0xYourHallAddress

# 2. Write the rulebook (owner account only)
genlayer write $HALL add_rule \
  --args "No unsolicited promotion" "Do not post ads or referral links in discussion threads."

# 3. File a case (run as the complainant account)
genlayer write $HALL file_case \
  --args 0xAccusedAddress 1 https://example.org/raw-evidence.txt

# 4. Find the case contract the hall deployed
genlayer call $HALL get_cases --args 0 10
CASE=0xCaseAddress

# 5. The accused answers (run as the accused account), then anyone rules
genlayer write $CASE submit_defense --args https://example.org/raw-defense.txt
genlayer write $CASE request_ruling
genlayer call $CASE get_status

# 6. The losing party appeals, then anyone triggers the appeal review
genlayer write $CASE appeal --args https://example.org/raw-grounds.txt
genlayer call $CASE get_status        # read "appeal_contract" from the output
genlayer write 0xAppealAddress review

# 7. Or, if nobody appeals, finalize after the appeal window
genlayer write $CASE finalize

# 8. Watch the standings change on the hall
genlayer call $HALL get_standing --args 0xAccusedAddress
genlayer call $HALL get_case --args $CASE
```

Notes:

- The CLI turns any bare `0x` + 40 hex value into an address argument. The
  contracts accept an address or a string, so both forms work.
- Use two or three different accounts: owner, complainant and accused. Each
  role is enforced on-chain.
- Evidence URLs must be plain, public pages that name a domain (no IP
  addresses, `localhost`, intranet or `.local` hosts, or embedded credentials)
  and that validators can fetch. Use pages that will not change after filing,
  such as a gist at a fixed revision or an archive link: the ruling pins a hash
  of the page, so a page edited afterwards makes any appeal fall back to the
  first ruling. Only the first 6000 characters of each page are read.
- Both windows must be between 60 seconds and one year. Keep them longer than
  the network finality window so results can arrive before a window closes.
- Outcomes reach the hall through `on="finalized"` messages, so standings
  update only after the ruling transaction has finalized, not at acceptance.
- If your CLI version asks for a fee profile or fee arguments, follow the
  fee-profile section of the GenLayer documentation.

### Option B: GenLayer Studio

Open the Studio on the Studionet network, create a new contract from
`contracts/concordat_hall.py`, fill in the six constructor fields shown in the
form, deploy, and call the methods from the Write Methods panel. Open each
case and appeal contract by its address to call its methods the same way.

## Contract reference

**ConcordatHall** (deploy this)

| Method | Who | Purpose |
| --- | --- | --- |
| `add_rule(title, text)` | owner | Add a rule, returns its number |
| `retire_rule(rule_number)` | owner | Stop accepting new cases for a rule |
| `forgive_points(member, points)` | owner | Amnesty (points must be >= 0), never below zero |
| `file_case(accused, rule_number, complaint_url)` | anyone allowed to file | Deploys a case, returns its address |
| `report_final(violation, severity)` | cases only | Settles a case and updates standings |
| `get_config`, `get_rules`, `get_standing`, `get_case`, `get_cases`, `get_case_count` | anyone | Read state |

**ConcordatCase**

| Method | Who | Purpose |
| --- | --- | --- |
| `submit_defense(url)` | accused | One defense, inside the defense window |
| `request_ruling()` | anyone | First-instance ruling |
| `appeal(grounds_url)` | losing party | Deploys the appeal contract |
| `finalize()` | anyone | Close an unappealed case after the window |
| `abandon_appeal()` | anyone | Close an appealed case with the first ruling if the review produced nothing within one appeal window |
| `receive_appeal_result(...)` | its appeal only | Close an appealed case |
| `get_status`, `can_request_ruling` | anyone | Read state |

**ConcordatAppeal**

| Method | Who | Purpose |
| --- | --- | --- |
| `review()` | anyone, once | Deference review, then reports to the case |
| `get_status` | anyone | Read state |

## Design notes and limits

- **Consensus rules.** Both rulings use `gl.vm.run_nondet_unsafe` with a
  custom validator that re-runs the review itself and compares only the
  decision fields. LLM wording is never compared. If the leader fails on a
  flaky LLM answer, validators disagree so the protocol rotates to a new
  leader; shared external failures (a page returning an error) are agreed on.
- **Prompt injection.** Complaint, defense and grounds pages are quoted
  between explicit markers and the model is told never to follow
  instructions inside them. Verdicts are structured, clamped to the 0-3
  scale, and a violation can never carry severity 0.
- **One appeal per case.** There is no second appeal and no value transfer;
  the project moves reputation, not funds.
- **Child deployment timing.** Cases and appeals are deployed with
  `on="accepted"` so they are usable immediately. They hold no funds and are
  only trusted through the authenticated flows above.
- **Verification status.** The contracts pass `genvm-lint` and the direct-mode
  test suite. The suite does not exercise multi-validator consensus or a live
  network, so run through the CLI flow above on Studionet before relying on it.

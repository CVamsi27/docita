# Landing editorial design

Approved on 2026-10-13 after visual review of Option A.

The homepage opens with “A calmer clinic day.” beside a large Today workspace illustration. A compact four-capability strip leads into Check in → Consult → Close the visit. Pricing links to the existing plan comparison and picker on `/pricing`; the final setup/demo actions sit beside access, consent and export controls. Product details, original captures and FAQ remain on `/product`.

Use the shared Fraunces heading face, Inter controls/body, warm background and clinical blue tokens. Both themes remain supported; light is the default and a stored user preference wins. Sections stack on mobile; navigation destinations stay visible. The homepage renders without client hydration or generated images.

Product illustrations use synthetic names and example invoice amounts. They are explicitly labeled, have descriptive accessible names, and do not contain working application controls or request patient data. They illustrate the workflow rather than claim to be screenshots. Existing real product captures remain on the detailed product page.

Implementation uses shared Section, PageContainer, Card, MicroLabel, CategoryAvatar and Button primitives. Browser theme storage is optional: failure to read/write storage does not break rendering or theme switching. Former detailed homepage fragments redirect to the corresponding `/product` fragment when JavaScript is enabled. Internal navigation and footer links use the dedicated routes directly. The `#pricing` fragment remains the homepage pricing summary.

Each dedicated detail route has a shared PageHeader with one H1. A visible-on-focus skip link takes keyboard users to main content, and demo supporting text uses shared tokens at a minimum of 11px.

Acceptance: one readable H1, configured setup/login destinations, working contact route, retained plan controls and screenshot lightbox, no horizontal overflow at 320px, saved theme persistence, keyboard access, visible legal links, and a successful Cloudflare build. Verification evidence belongs in the implementation plan; no deployment is implied.

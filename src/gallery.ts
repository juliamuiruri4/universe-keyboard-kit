export interface GalleryPhoto {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  title: string;
  caption: string;
  credit: string;
}

const collection = [
  ['R0002896', 'A little pink. A lot of possibility.', 'An angled view of the finished keyboard with a transparent pink case, gray keycaps, and blue accents.'],
  ['R0002874', 'A box full of maybe.', 'The GitHub and Omnitype Bauer Lite blind box on a wooden tabletop.'],
  ['R0002901', 'Made for Universe.', 'A close-up of the blue UNIVERSE’26 Enter key among gray keycaps.'],
  ['R0002883', 'Meet the Hawks.', 'A packet of Hawk Omnitype linear switches resting on a keyboard.'],
  ['R0002894', 'A familiar face on Escape.', 'A blue GitHub-logo Escape key on the transparent pink keyboard.'],
  ['R0002895', 'The whole picture.', 'The complete compact keyboard, viewed from above against a softly lit pink background.'],
  ['R0002884', 'Which color will you get?', 'The open kit box with the printed question, Which color will you get?'],
  ['R0002907', 'Clear case. Nice details.', 'The transparent case edge with the Omnitype logo and USB-C port.'],
  ['R0002888', 'One very special key.', 'A hand holding a blue UNIVERSE’26 keycap in front of a keyboard.'],
  ['R0002866', 'The collaboration.', 'GitHub and Omnitype logos printed on the cardboard keyboard kit box.'],
  ['R0002867', 'A surprise inside.', 'The blind-box label printed on the side of the keyboard kit packaging.'],
  ['R0002869', 'Good things, boxed.', 'GitHub and Omnitype symbols printed on one end of the brown cardboard box.'],
  ['R0002870', 'Pick your mystery.', 'The Bauer Lite blind-box label, photographed straight on.'],
  ['R0002871', 'Before the first click.', 'The front of the GitHub and Omnitype keyboard kit box.'],
  ['R0002872', 'Ready to open.', 'The keyboard kit box standing on a wooden surface.'],
  ['R0002873', 'Read the fine print.', 'The packaging lists the random colorway and standard parts included in the Bauer Lite blind box.'],
  ['R0002875', 'A new perspective.', 'The unopened keyboard kit box photographed from above at an angle.'],
  ['R0002876', 'Switches, ready to go.', 'A hand holding a sealed packet of Omnitype switches.'],
  ['R0002887', 'Small but special.', 'A blue UNIVERSE’26 keycap resting in an open palm.'],
  ['R0002889', 'A key worth keeping.', 'A close-up of a hand holding the blue Universe keycap.'],
  ['R0002890', 'A blue-sky kind of build.', 'Blue Universe and illustrated accent keys among gray keyboard keycaps.'],
  ['R0002891', 'From the right angle.', 'The assembled keyboard seen along the right edge of its transparent case.'],
  ['R0002892', 'Under the surface.', 'A low side view of the transparent pink case and rows of keycaps.'],
  ['R0002893', 'The view from here.', 'A close view along the left edge of the assembled keyboard.'],
  ['R0002897', 'Details at every corner.', 'The top-left corner of the keyboard and blue Escape key on a pink background.'],
  ['R0002898', 'Keys in good company.', 'A top view of the keyboard’s right-hand keys and blue Universe Enter key.'],
  ['R0002899', 'A desk-level daydream.', 'The keyboard photographed at a low angle from its top-left corner.'],
  ['R0002900', 'Clear on the outside.', 'A side angle showing the transparent pink housing and gray keycap profile.'],
  ['R0002902', 'Escape to something good.', 'The blue GitHub Escape key, transparent case corner, and number keys.'],
  ['R0002903', 'A different profile.', 'Rows of gray keycaps and a blue accent key seen from the edge of the case.'],
  ['R0002904', 'All lined up.', 'A shallow view across the keycap rows toward the Universe key.'],
  ['R0002905', 'A closer kind of click.', 'The Universe keycap and illustrated accent keys viewed at key height.'],
  ['R0002906', 'One last little detail.', 'A close crop of the blue Escape key at the corner of the transparent case.'],
  ['R0002908', 'Signed, Omnitype.', 'The Omnitype wordmark on the transparent keyboard case.'],
] as const;

export const galleryPhotos: GalleryPhoto[] = collection.map(([id, title, alt]) => ({
  id,
  src: `images/${id}.webp`,
  thumbnail: `images/${id}-thumb.webp`,
  title,
  alt,
  caption: alt,
  credit: 'Universe keyboard collection · photos supplied by the project owner',
}));

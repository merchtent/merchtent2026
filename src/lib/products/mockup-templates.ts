export type MockupSide = "front" | "back";
export type LifestyleModelSetId =
    | "gig"
    | "crowd"
    | "outdoor"
    | "jazz"
    | "hoodie-rehearsal"
    | "hoodie-vinyl-press"
    | "hoodie-loading-dock"
    | "hoodie-radio-studio";

export type LifestyleModelSet = {
    id: LifestyleModelSetId;
    label: string;
    audience: "female" | "male";
    frontTemplateId: string;
    backTemplateId: string;
};

type MockupProductIdentity = {
    key?: string;
    brand?: string;
    model?: string;
};

export type MockupTemplate = {
    publicPath: string;
    fit: "cover";
    canvasPlacement: GeometryRect;
    artworkPlacement?: GeometryRect;
    background: string;
};

export type LifestyleMockupTemplate = {
    id: string;
    label: string;
    side: MockupSide;
    modelSetId: LifestyleModelSetId;
    publicPath: string;
    imageWidth: number;
    imageHeight: number;
    printMesh: { x: number; y: number }[][];
};

const GILDAN_64000_BLACK_GIG: LifestyleMockupTemplate = {
    id: "gig-front",
    label: "At the gig",
    side: "front",
    modelSetId: "gig",
    publicPath: "/images/mockups/gildan-64000/black-gig-model.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 405, y: 529 }, { x: 478, y: 523 }, { x: 550, y: 520 }, { x: 622, y: 523 }, { x: 692, y: 529 }],
        [{ x: 396, y: 617 }, { x: 474, y: 613 }, { x: 551, y: 610 }, { x: 624, y: 613 }, { x: 697, y: 617 }],
        [{ x: 385, y: 710 }, { x: 468, y: 704 }, { x: 550, y: 698 }, { x: 632, y: 704 }, { x: 705, y: 710 }],
        [{ x: 380, y: 810 }, { x: 464, y: 804 }, { x: 548, y: 798 }, { x: 634, y: 805 }, { x: 710, y: 811 }],
        [{ x: 390, y: 917 }, { x: 470, y: 912 }, { x: 550, y: 906 }, { x: 630, y: 912 }, { x: 702, y: 919 }],
    ],
};

const GILDAN_64000_BLACK_GIG_ANGLED: LifestyleMockupTemplate = {
    id: "gig-angled",
    label: "In the crowd",
    side: "front",
    modelSetId: "crowd",
    publicPath: "/images/mockups/gildan-64000/black-gig-model-angled.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 399, y: 530 }, { x: 470, y: 528 }, { x: 541, y: 532 }, { x: 611, y: 543 }, { x: 676, y: 556 }],
        [{ x: 383, y: 614 }, { x: 456, y: 615 }, { x: 528, y: 621 }, { x: 598, y: 633 }, { x: 664, y: 647 }],
        [{ x: 363, y: 703 }, { x: 439, y: 707 }, { x: 510, y: 715 }, { x: 581, y: 730 }, { x: 647, y: 743 }],
        [{ x: 342, y: 791 }, { x: 420, y: 798 }, { x: 492, y: 809 }, { x: 560, y: 824 }, { x: 628, y: 839 }],
        [{ x: 321, y: 881 }, { x: 401, y: 889 }, { x: 474, y: 902 }, { x: 543, y: 917 }, { x: 611, y: 930 }],
    ],
};

const GILDAN_64000_BLACK_OUTDOOR: LifestyleMockupTemplate = {
    id: "outdoor-show",
    label: "Outdoor show",
    side: "front",
    modelSetId: "outdoor",
    publicPath: "/images/mockups/gildan-64000/black-outdoor-show-model.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 401, y: 480 }, { x: 475, y: 476 }, { x: 548, y: 475 }, { x: 620, y: 479 }, { x: 690, y: 486 }],
        [{ x: 394, y: 568 }, { x: 471, y: 565 }, { x: 549, y: 565 }, { x: 625, y: 568 }, { x: 698, y: 574 }],
        [{ x: 388, y: 658 }, { x: 468, y: 657 }, { x: 550, y: 655 }, { x: 630, y: 659 }, { x: 706, y: 667 }],
        [{ x: 382, y: 752 }, { x: 465, y: 750 }, { x: 550, y: 750 }, { x: 633, y: 755 }, { x: 710, y: 765 }],
        [{ x: 384, y: 852 }, { x: 468, y: 849 }, { x: 551, y: 850 }, { x: 633, y: 856 }, { x: 708, y: 868 }],
    ],
};

const GILDAN_64000_BLACK_JAZZ: LifestyleMockupTemplate = {
    id: "jazz-club",
    label: "Jazz club",
    side: "front",
    modelSetId: "jazz",
    publicPath: "/images/mockups/gildan-64000/black-jazz-club-model.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 388, y: 515 }, { x: 462, y: 512 }, { x: 537, y: 511 }, { x: 611, y: 515 }, { x: 682, y: 523 }],
        [{ x: 383, y: 608 }, { x: 461, y: 605 }, { x: 539, y: 605 }, { x: 615, y: 609 }, { x: 688, y: 617 }],
        [{ x: 377, y: 701 }, { x: 457, y: 698 }, { x: 540, y: 698 }, { x: 621, y: 704 }, { x: 695, y: 713 }],
        [{ x: 374, y: 795 }, { x: 457, y: 792 }, { x: 541, y: 793 }, { x: 625, y: 799 }, { x: 700, y: 809 }],
        [{ x: 378, y: 891 }, { x: 461, y: 888 }, { x: 542, y: 890 }, { x: 625, y: 897 }, { x: 698, y: 908 }],
    ],
};

const GILDAN_64000_BLACK_GIG_BACK: LifestyleMockupTemplate = {
    id: "gig-back",
    label: "At the gig - back",
    side: "back",
    modelSetId: "gig",
    publicPath: "/images/mockups/gildan-64000/black-gig-model-back.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 390, y: 484 }, { x: 468, y: 480 }, { x: 546, y: 479 }, { x: 623, y: 483 }, { x: 698, y: 490 }],
        [{ x: 384, y: 579 }, { x: 465, y: 575 }, { x: 546, y: 574 }, { x: 626, y: 579 }, { x: 703, y: 587 }],
        [{ x: 379, y: 674 }, { x: 462, y: 670 }, { x: 546, y: 669 }, { x: 629, y: 675 }, { x: 708, y: 684 }],
        [{ x: 376, y: 770 }, { x: 461, y: 766 }, { x: 547, y: 766 }, { x: 631, y: 772 }, { x: 710, y: 782 }],
        [{ x: 380, y: 868 }, { x: 464, y: 865 }, { x: 548, y: 866 }, { x: 630, y: 873 }, { x: 706, y: 884 }],
    ],
};

const GILDAN_64000_BLACK_GIG_ANGLED_BACK: LifestyleMockupTemplate = {
    id: "gig-angled-back",
    label: "In the crowd - back",
    side: "back",
    modelSetId: "crowd",
    publicPath: "/images/mockups/gildan-64000/black-gig-model-angled-back.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 393, y: 505 }, { x: 468, y: 501 }, { x: 543, y: 500 }, { x: 617, y: 504 }, { x: 690, y: 511 }],
        [{ x: 386, y: 604 }, { x: 464, y: 600 }, { x: 543, y: 599 }, { x: 621, y: 604 }, { x: 697, y: 612 }],
        [{ x: 381, y: 703 }, { x: 461, y: 699 }, { x: 543, y: 699 }, { x: 625, y: 705 }, { x: 702, y: 714 }],
        [{ x: 378, y: 803 }, { x: 460, y: 799 }, { x: 544, y: 800 }, { x: 628, y: 806 }, { x: 705, y: 816 }],
        [{ x: 381, y: 905 }, { x: 463, y: 902 }, { x: 545, y: 904 }, { x: 627, y: 911 }, { x: 702, y: 922 }],
    ],
};

const GILDAN_64000_BLACK_OUTDOOR_BACK: LifestyleMockupTemplate = {
    id: "outdoor-show-back",
    label: "Outdoor show - back",
    side: "back",
    modelSetId: "outdoor",
    publicPath: "/images/mockups/gildan-64000/black-outdoor-show-model-back.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 379, y: 441 }, { x: 462, y: 437 }, { x: 545, y: 436 }, { x: 627, y: 440 }, { x: 705, y: 448 }],
        [{ x: 373, y: 543 }, { x: 459, y: 539 }, { x: 546, y: 539 }, { x: 632, y: 544 }, { x: 712, y: 553 }],
        [{ x: 368, y: 647 }, { x: 456, y: 643 }, { x: 546, y: 644 }, { x: 636, y: 650 }, { x: 718, y: 660 }],
        [{ x: 365, y: 752 }, { x: 455, y: 749 }, { x: 547, y: 751 }, { x: 639, y: 758 }, { x: 721, y: 769 }],
        [{ x: 368, y: 859 }, { x: 459, y: 857 }, { x: 549, y: 860 }, { x: 639, y: 868 }, { x: 718, y: 881 }],
    ],
};

const GILDAN_64000_BLACK_JAZZ_BACK: LifestyleMockupTemplate = {
    id: "jazz-club-back",
    label: "Jazz club - back",
    side: "back",
    modelSetId: "jazz",
    publicPath: "/images/mockups/gildan-64000/black-jazz-club-model-back.png",
    imageWidth: 1086,
    imageHeight: 1448,
    printMesh: [
        [{ x: 386, y: 477 }, { x: 462, y: 474 }, { x: 538, y: 473 }, { x: 613, y: 477 }, { x: 685, y: 485 }],
        [{ x: 380, y: 575 }, { x: 458, y: 571 }, { x: 539, y: 571 }, { x: 618, y: 576 }, { x: 691, y: 585 }],
        [{ x: 374, y: 674 }, { x: 456, y: 670 }, { x: 539, y: 671 }, { x: 622, y: 677 }, { x: 697, y: 687 }],
        [{ x: 371, y: 774 }, { x: 455, y: 771 }, { x: 540, y: 773 }, { x: 625, y: 780 }, { x: 700, y: 791 }],
        [{ x: 375, y: 876 }, { x: 458, y: 874 }, { x: 541, y: 877 }, { x: 624, y: 885 }, { x: 697, y: 897 }],
    ],
};

const GILDAN_64000_MODEL_SETS: LifestyleModelSet[] = [
    { id: "gig", label: "At the gig", audience: "female", frontTemplateId: "gig-front", backTemplateId: "gig-back" },
    { id: "crowd", label: "In the crowd", audience: "female", frontTemplateId: "gig-angled", backTemplateId: "gig-angled-back" },
    { id: "outdoor", label: "Outdoor show", audience: "male", frontTemplateId: "outdoor-show", backTemplateId: "outdoor-show-back" },
    { id: "jazz", label: "Jazz club", audience: "male", frontTemplateId: "jazz-club", backTemplateId: "jazz-club-back" },
];

function createHoodiePrintMesh(left: number, top: number, right: number, bottom: number) {
    return Array.from({ length: 5 }, (_, row) => {
        const verticalProgress = row / 4;
        const y = top + (bottom - top) * verticalProgress;
        const edgeInset = Math.sin(verticalProgress * Math.PI) * 8;

        return Array.from({ length: 5 }, (_, column) => {
            const horizontalProgress = column / 4;
            const x = left + edgeInset + (right - left - edgeInset * 2) * horizontalProgress;
            const fabricCurve = Math.sin(horizontalProgress * Math.PI) * 4;
            return { x: Math.round(x), y: Math.round(y + fabricCurve) };
        });
    });
}

const GILDAN_18500_BLACK_REHEARSAL_FRONT: LifestyleMockupTemplate = {
    id: "hoodie-rehearsal-front",
    label: "Rehearsal room",
    side: "front",
    modelSetId: "hoodie-rehearsal",
    publicPath: "/images/mockups/gildan-18500/lifestyle/woman-rehearsal-front.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(277, 594, 747, 911),
};

const GILDAN_18500_BLACK_REHEARSAL_BACK: LifestyleMockupTemplate = {
    id: "hoodie-rehearsal-back",
    label: "Rehearsal room - back",
    side: "back",
    modelSetId: "hoodie-rehearsal",
    publicPath: "/images/mockups/gildan-18500/lifestyle/woman-rehearsal-back.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(337, 640, 687, 1036),
};

const GILDAN_18500_BLACK_VINYL_FRONT: LifestyleMockupTemplate = {
    id: "hoodie-vinyl-press-front",
    label: "Vinyl press",
    side: "front",
    modelSetId: "hoodie-vinyl-press",
    publicPath: "/images/mockups/gildan-18500/lifestyle/woman-vinyl-press-front.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(280, 590, 744, 901),
};

const GILDAN_18500_BLACK_VINYL_BACK: LifestyleMockupTemplate = {
    id: "hoodie-vinyl-press-back",
    label: "Vinyl press - back",
    side: "back",
    modelSetId: "hoodie-vinyl-press",
    publicPath: "/images/mockups/gildan-18500/lifestyle/woman-vinyl-press-back.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(339, 625, 685, 1017),
};

const GILDAN_18500_BLACK_LOADING_DOCK_FRONT: LifestyleMockupTemplate = {
    id: "hoodie-loading-dock-front",
    label: "Loading dock",
    side: "front",
    modelSetId: "hoodie-loading-dock",
    publicPath: "/images/mockups/gildan-18500/lifestyle/man-loading-dock-front.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(272, 555, 752, 865),
};

const GILDAN_18500_BLACK_LOADING_DOCK_BACK: LifestyleMockupTemplate = {
    id: "hoodie-loading-dock-back",
    label: "Loading dock - back",
    side: "back",
    modelSetId: "hoodie-loading-dock",
    publicPath: "/images/mockups/gildan-18500/lifestyle/man-loading-dock-back.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(330, 550, 694, 962),
};

const GILDAN_18500_BLACK_RADIO_FRONT: LifestyleMockupTemplate = {
    id: "hoodie-radio-studio-front",
    label: "Radio studio",
    side: "front",
    modelSetId: "hoodie-radio-studio",
    publicPath: "/images/mockups/gildan-18500/lifestyle/man-radio-studio-front.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(266, 513, 758, 837),
};

const GILDAN_18500_BLACK_RADIO_BACK: LifestyleMockupTemplate = {
    id: "hoodie-radio-studio-back",
    label: "Radio studio - back",
    side: "back",
    modelSetId: "hoodie-radio-studio",
    publicPath: "/images/mockups/gildan-18500/lifestyle/man-radio-studio-back.png",
    imageWidth: 1024,
    imageHeight: 1536,
    printMesh: createHoodiePrintMesh(326, 520, 698, 942),
};

const GILDAN_18500_MODEL_SETS: LifestyleModelSet[] = [
    {
        id: "hoodie-rehearsal",
        label: "Rehearsal room",
        audience: "female",
        frontTemplateId: "hoodie-rehearsal-front",
        backTemplateId: "hoodie-rehearsal-back",
    },
    {
        id: "hoodie-vinyl-press",
        label: "Vinyl press",
        audience: "female",
        frontTemplateId: "hoodie-vinyl-press-front",
        backTemplateId: "hoodie-vinyl-press-back",
    },
    {
        id: "hoodie-loading-dock",
        label: "Loading dock",
        audience: "male",
        frontTemplateId: "hoodie-loading-dock-front",
        backTemplateId: "hoodie-loading-dock-back",
    },
    {
        id: "hoodie-radio-studio",
        label: "Radio studio",
        audience: "male",
        frontTemplateId: "hoodie-radio-studio-front",
        backTemplateId: "hoodie-radio-studio-back",
    },
];

const GILDAN_18500_LIFESTYLE_TEMPLATES = [
    GILDAN_18500_BLACK_REHEARSAL_FRONT,
    GILDAN_18500_BLACK_REHEARSAL_BACK,
    GILDAN_18500_BLACK_VINYL_FRONT,
    GILDAN_18500_BLACK_VINYL_BACK,
    GILDAN_18500_BLACK_LOADING_DOCK_FRONT,
    GILDAN_18500_BLACK_LOADING_DOCK_BACK,
    GILDAN_18500_BLACK_RADIO_FRONT,
    GILDAN_18500_BLACK_RADIO_BACK,
];

const GILDAN_64000_BLACK: Record<MockupSide, MockupTemplate> = {
    front: {
        publicPath: "/images/mockups/gildan-64000/black-front.jpg",
        fit: "cover",
        canvasPlacement: { x: 0, y: 0, width: 1, height: 1, units: "ratio" },
        background: "#ffffff",
    },
    back: {
        publicPath: "/images/mockups/gildan-64000/black-back.jpg",
        fit: "cover",
        canvasPlacement: { x: 0, y: 0, width: 1, height: 1, units: "ratio" },
        background: "#ffffff",
    },
};

const GILDAN_18500_BLACK: Record<MockupSide, MockupTemplate> = {
    front: {
        publicPath: "/images/mockups/gildan-18500/black-front.jpg",
        fit: "cover",
        canvasPlacement: { x: -0.1, y: 0.05, width: 1.2, height: 0.9, units: "ratio" },
        artworkPlacement: {
            x: 344 / 1200,
            y: 535 / 1600,
            width: 512 / 1200,
            height: 346 / 1600,
            units: "ratio",
        },
        background: "#ffffff",
    },
    back: {
        publicPath: "/images/mockups/gildan-18500/black-back.jpg",
        fit: "cover",
        canvasPlacement: { x: -0.1, y: 0.05, width: 1.2, height: 0.9, units: "ratio" },
        artworkPlacement: {
            x: 344 / 1200,
            y: 600 / 1600,
            width: 512 / 1200,
            height: 580 / 1600,
            units: "ratio",
        },
        background: "#ffffff",
    },
};

function isGildan64000(product: MockupProductIdentity) {
    const key = product.key?.toLowerCase() ?? "";
    const brand = product.brand?.toLowerCase() ?? "";
    const model = product.model?.toLowerCase() ?? "";
    return key.includes("gildan-64000") || key === "printify-145" || (brand === "gildan" && model === "64000");
}

function isGildan18500(product: MockupProductIdentity) {
    const key = product.key?.toLowerCase() ?? "";
    const brand = product.brand?.toLowerCase() ?? "";
    const model = product.model?.toLowerCase() ?? "";
    return key.includes("gildan-18500") || key === "printify-77" || (brand === "gildan" && model === "18500");
}

function isBlack(color: string) {
    const normalized = color.toLowerCase();
    return normalized === "#111111" || normalized === "#000000" || normalized === "#0b0b0b";
}

export function getMockupTemplate(
    product: MockupProductIdentity,
    color: string,
    side: MockupSide
) {
    if (isGildan18500(product) && isBlack(color)) return GILDAN_18500_BLACK[side];
    if (isGildan64000(product) && isBlack(color)) return GILDAN_64000_BLACK[side];
    return null;
}

export function getLifestyleModelSets(product: MockupProductIdentity, color: string) {
    if (isGildan18500(product) && isBlack(color)) return GILDAN_18500_MODEL_SETS;
    return isGildan64000(product) && isBlack(color) ? GILDAN_64000_MODEL_SETS : [];
}

export function getLifestyleMockupTemplates(
    product: MockupProductIdentity,
    color: string,
    selectedModelSets?: LifestyleModelSetId[]
) {
    const templates = !isBlack(color)
        ? []
        : isGildan18500(product)
            ? GILDAN_18500_LIFESTYLE_TEMPLATES
            : isGildan64000(product)
                ? [
            GILDAN_64000_BLACK_GIG,
            GILDAN_64000_BLACK_GIG_BACK,
            GILDAN_64000_BLACK_GIG_ANGLED,
            GILDAN_64000_BLACK_GIG_ANGLED_BACK,
            GILDAN_64000_BLACK_OUTDOOR,
            GILDAN_64000_BLACK_OUTDOOR_BACK,
            GILDAN_64000_BLACK_JAZZ,
            GILDAN_64000_BLACK_JAZZ_BACK,
                ]
                : [];
    return selectedModelSets
        ? templates.filter((template) => selectedModelSets.includes(template.modelSetId))
        : templates;
}
import type { GeometryRect } from "./design-geometry";

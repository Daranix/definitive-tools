export const TEMPLATES_TYPES = [
    'image-right',
    'hero',
    'logos',
    'basic',
    'notice'
] as const;

export type TemplateType = typeof TEMPLATES_TYPES[number];

export const BACKGROUND_TYPES = [
    'gradient',
    'solid',
    'image'
] as const;

export type BackgroundType = typeof BACKGROUND_TYPES[number];

export const GRADIENT_DIRECTIONS = [
    'top',
    'top right',
    'right',
    'bottom right',
    'bottom',
    'bottom left',
    'left',
    'top left',
] as const;

export type GradientDirection = typeof GRADIENT_DIRECTIONS[number];

export const BACKGROUND_OVERLAY_PATTERNS = [
    'none',
    'grid',
    'graph',
    'dots'
] as const;

export type BackgroundOverlayPattern = typeof BACKGROUND_OVERLAY_PATTERNS[number];

export const BACKGROUND_OVERLAY_PATTERNS_VIEW = {
    'none': { icon: 'circle-off', label: 'None' },
    'grid': { icon: 'grid-2-x-2', label: 'Grid' },
    'graph': { icon: 'grid-3-x-3', label: 'Graph' },
    'dots': { icon: 'circle-ellipsis', label: 'Dots' }
} as const satisfies Record<BackgroundOverlayPattern, { icon: string, label: string }>;

export const BACKGROUND_OVERLAY_COLORS = [
    'rgba(3, 7, 18, 0.8)',
    'rgba(107, 114, 128, 0.8)',
    'rgba(249, 250, 251, 0.8)'
];

export const GRADIENT_COMBINATIONS = [
    [
        "rgb(236, 72, 153)",
        "rgb(239, 68, 68)",
        "rgb(234, 179, 8)"
    ],
    [
        "rgb(202, 138, 4)",
        "rgb(220, 38, 38)"
    ],
    [
        "rgb(244, 63, 94)",
        "rgb(248, 113, 113)",
        "rgb(239, 68, 68)"
    ],
    [
        "rgb(253, 164, 175)",
        "rgb(244, 63, 94)"
    ],
    [
        "rgb(251, 146, 60)",
        "rgb(251, 113, 133)"
    ],
    [
        "rgb(251, 113, 133)",
        "rgb(253, 186, 116)"
    ],
    [
        "rgb(254, 202, 202)",
        "rgb(252, 165, 165)",
        "rgb(254, 240, 138)"
    ],
    [
        "rgb(199, 210, 254)",
        "rgb(254, 202, 202)",
        "rgb(254, 249, 195)"
    ],
    [
        "rgb(134, 239, 172)",
        "rgb(59, 130, 246)",
        "rgb(147, 51, 234)"
    ],
    [
        "rgb(134, 239, 172)",
        "rgb(192, 132, 252)"
    ],
    [
        "rgb(192, 132, 252)",
        "rgb(250, 204, 21)"
    ],
    [
        "rgb(165, 180, 252)",
        "rgb(192, 132, 252)"
    ],
    [
        "rgb(249, 168, 212)",
        "rgb(216, 180, 254)",
        "rgb(129, 140, 248)"
    ],
    [
        "rgb(233, 213, 255)",
        "rgb(192, 132, 252)",
        "rgb(107, 33, 168)"
    ],
    [
        "rgb(219, 234, 254)",
        "rgb(147, 197, 253)",
        "rgb(59, 130, 246)"
    ],
    [
        "rgb(165, 243, 252)",
        "rgb(34, 211, 238)"
    ],
    [
        "rgb(34, 197, 94)",
        "rgb(21, 128, 61)"
    ],
    [
        "rgb(16, 185, 129)",
        "rgb(101, 163, 13)"
    ],
    [
        "rgb(96, 165, 250)",
        "rgb(52, 211, 153)"
    ],
    [
        "rgb(187, 247, 208)",
        "rgb(74, 222, 128)",
        "rgb(34, 197, 94)"
    ],
    [
        "rgb(187, 247, 208)",
        "rgb(34, 197, 94)"
    ],
    [
        "rgb(187, 247, 208)",
        "rgb(134, 239, 172)",
        "rgb(59, 130, 246)"
    ],
    [
        "rgb(153, 246, 228)",
        "rgb(217, 249, 157)"
    ],
    [
        "rgb(254, 240, 138)",
        "rgb(187, 247, 208)",
        "rgb(134, 239, 172)"
    ],
    [
        "#434343 0%",
        "black 100%"
    ],
    [
        "rgb(17, 24, 39)",
        "rgb(75, 85, 99)"
    ],
    [
        "#868f96 0%",
        "#596164 100%"
    ],
    [
        "#d7d2cc 0%",
        "#304352 100%"
    ],
    [
        "#8baaaa 0%",
        "#ae8b9c 100%"
    ],
    [
        "rgb(229, 231, 235)",
        "rgb(156, 163, 175)",
        "rgb(75, 85, 99)"
    ],
    [
        "#f5f7fa 0%",
        "#c3cfe2 100%"
    ],
    [
        "#d5d4d0 0%",
        "#d5d4d0 1%",
        "#eeeeec 31%",
        "#efeeec 75%",
        "#e9e9e7 100%"
    ]
] as const satisfies string[][];

export const SOLID_COLORS = [
    "#D14D72",
    "#FF8080",
    "#FF9B9B",
    "#FFABAB",
    "#E8A0BF",
    "#FEBBCC",
    "#FCC8D1",
    "#FFC5C5",
    "#D3756B",
    "#F0997D",
    "#FEBE8C",
    "#FFC3A1",
    "#FFD966",
    "#F2D388",
    "#FCE38A",
    "#FFF6BD",
    "#67729D",
    "#7C93C3",
    "#8EA7E9",
    "#95BDFF",
    "#A084DC",
    "#B2A4FF",
    "#DBC4F0",
    "#E5D1FA",
    "#61876E",
    "#609966",
    "#A6BB8D",
    "#ABC4AA",
    "#967E76",
    "#D7C0AE",
    "#EEE3CB",
    "#FFF3E2",
    "#525E75",
    "#545B77",
    "#7B8FA1",
    "#9E9FA5",
    "#000000",
    "#FFFFFF"
] as const;


# @frontline-hq/tdc

This library is dedicated to Ivan Hover, with whom I had the honor to work with at inlang and from whom I learned a great deal.
Some parts of this library contain code borrowed from inlang, which I am also grateful for.

It's purpose is to minimize the CSS footprint of components with a lot of different design variants (e.g. components in component libraries)

This is accomplished by offering a component design registration standard.

## Setup

1.  Install npm package `@frontlinq-hq/tdc`
2.  Add configuration file in the root directory of your vite project (named `tdc.config.ts`):

    ```ts
    // tdc.config.ts
    import type { LibraryConfig } from "@frontline-hq/tdc";

    export default {
        debug: false,
        /* Here go your component design registrations */
        registrations: [],
        tagNameDelimiter: "-",
        /* The path to your tailwind config relative to your projects root */
        tailwindConfigPath: "./tailwind.config.ts",
    } satisfies LibraryConfig;
    ```

3.  Add plugin to sveltekit vite config:

    ```ts
    // vite.config.ts
    import { defineConfig } from "vite";
    import { sveltekit } from "@sveltejs/kit/vite";
    import { plugin } from "@frontline-hq/tdc/plugin";

    export default defineConfig({
        plugins: [await plugin(), sveltekit()],
    });
    ```

4.  Add safelit & content configuration to tailwind config:

    ```ts
    // tailwind.config.ts
    import type { Config } from "tailwindcss";
    import { getDynamicSafelist } from "@frontline-hq/tdc";

    export default {
        content: [
            "./src/**/*.{html,js,svelte,ts}",
            /* Exclude *.tdc.ts files from tailwind class detection */
            "!**/*.tdc.ts",
            /* Exclude tdc.config.ts file from tailwind class detection */
            "!tdc.config.ts",
        ],
        theme: {
            extend: {},
        },
        /* Add the safelist here */
        safelist: [
            getDynamicSafelist({
                /* optionally debug: boolean to debug safelist */
            }),
        ],
        plugins: [],
    } as Config;
    ```

Now you are ready to go and build optimized components!

## Component registration

You can write registrations either

-   in the `tdc.config.ts` file
-   or in `_name_.tdc.ts` (and then import and add to registrations in the `tdc.config.ts` file)

Registrations are written as follows:

```ts
// icon.tdc.ts
export const iconRegistration = new Registration({
    identifier: "icon",
    props: { size: ["xl", "2xl"], destructive: ["true", "false"] },
    styles: s => ({
        c: `border-${s("size", { xl: "2", "2xl": "4" })} text-${s(
            "destructive",
            "red",
            {
                false: "green",
            }
        )}-400`,
    }),
    dependencies: {},
    mappings: {},
    importPath: "$lib/components/icon",
});
```

#### `identifier`

The identifier determines how the component that can be uses is called.
In the above example: `<tdc-icon></tdc-icon>`.

#### `importPath`

The brilliant thing is that you don't need to import the components anymore into your `.svelte` code.
Just use them!

```svelte
<script>
    <!-- NO IMPORT -->
</script>

<tdc-icon />
```

The import is handled by the library depending on the `importPath` that you specify for the registration.
Please make sure, that the import path is not relative, but absolute. E.g. use aliases like `$lib`, so that the import can be resolved from anywhere it will be used.

#### `props`

The props specified are available on the component tag as the `tdc` attribute:

```svelte
<tdc-icon tdc={{size: "xl", destructive: "true"}}>
    <!-- Your markup -->
</tdc-icon>
```

This will inject the tdc icon component with the size xl and the destructive variant.
You can also specify variants for any tailwind modifier:

```svelte
<tdc-icon tdc={{ size: 'xl', destructive: { default: true, md: false } }} />
```

This will inject the xl component styles always.
By default the destructive component styles will be used and on tailwind `md:` screens the non-destructive component.

#### `styles`

This is how you actually register the styles - as a function.
The return value of the function will be available within your component definition as the `tdc.styles` property:

```svelte
<!-- Icon.svelte definition -->
<script lang="ts">
	import type { TdcProp } from '@frontline-hq/tdc';
	import type { iconRegistration } from './icon.tdc.ts';

	interface $$Props extends HTMLElement {
		tdc: TdcProp<typeof iconRegistration>;
	}

	export let tdc: $$Props['tdc'];
</script>

<!-- Compiled result of tdc.styles.c is an array of strings -->
<div class={tdc.styles.c.join(' ')}>Hey there</div>
```

The compiled classes (depending on the used component variants) will be split into an array of strings.
The parameter of the styles function takes two or three arguments:

##### 2 Arguments:

`(prop: PropsKey, styles: Record<PropsValue, string>)`

-   `PropsKey` is the name of some component prop (e.g. destructive in this case).
-   `PropsValue` is an available value of this prop (e.g. true or false for destructive)

Note that the second argument needs to be a full mapping of all states.
That means it has to be an object that describes the styles for every variant (`true` and `false`) of the specific prop you are targeting (`destructive`).

##### 3 Arguments

`(prop: PropsKey, defaultStyle: string, styles: Partial<Record<PropsValue, string>>)`

Same as above, just that the second prop is the default value.
This means you only need to give a partial mapping of component props to styles as the third argument.

The styles define what properties you will have available in the styles object after compilation.
In this example, it is only the property `c`, but you can define styles for any key you want:

```ts
/* ... */
styles: s => ({
    c: `border-${s("size", { xl: "2", "2xl": "4" })} text-${s(
        "destructive",
        "red",
        {
            false: "green",
        }
    )}-400`,
    some-other-key: "... some styles ..."
});
/* ... */
```

#### `dependencies`

Now it gets interesting.
You can even nest component insertion!

Surely you know the case where a specific component variant implies that usage of another specific component variant?
Like a small button implies the usage of a small icon within?

Well this is called dependencies.

`dependencies` are defined as an object where you can just insert the registration of other components.

e.g. for a button:

```ts
const iconRegistration = new Registration({ identifier: "icon" /*  */ });
const buttonRegistration = new Registration({
    identifier: "button",
    /* ... */
    dependencies: {
        icon: iconRegistration,
    },
});
```

Now this also has implications for injection within `.svelte` files, as even the dependencies are detected:

```svelte
<!-- Will injection the icon registration from button -->
<tdc-button-icon/>
<!-- Will inject the button component -->
<tdc-button/>
```

The generated styles for the `icon` registration will be available in the `tdc.children.icon` prop after injection.

#### `mappings`

Now the only thing left to specify is how the parent props are actually mapped to the dependency props!
E.g. we want to map the buttons props to the icons props, more specifically we want:

-   The "sm" button to use a "md" icon and the "md" button to use a "lg" icon
-   The destructive properties of the components to match

The mappings are defined using a helper function, which again takes 2 or 3 arguments.

1.  The first argument is always the parent components prop name
2.  The second argument can either be a full mapping (object) of `parent prop value -> dependency prop value`, e.g. `button: md -> icon: 2xl` or just the default dependency prop value.
3.  The third argument is only available when the second is a default value (see destructive below) - it is a partial mapping of `parent -> dependency` mapping that extends the default dependency prop.

```ts
/* button registration ... */
mappings: {
		icon: {
			destructive: (m) => m('destructive', true, { false: 'false' }),
			size: (m) => m('scale', { md: '2xl', sm: 'xl' })
		}
	},
/* ... */
```

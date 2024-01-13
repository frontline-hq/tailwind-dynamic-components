With the current solution, there is still room for improvement.

#### Naming problem

As someone once said, naming is one of the hardest things in software development.
Right now, we have to think of unique names for every style that we register, without knowing what styles might still be registered in the future

#### Loss of typesafety

Currently, when adding / using styles we don't get any typesafety, as typescript template literals are quite limited:

```svelte
<MyComponent style={["sm_b0is", "md:md_b0is"]}
```

For instance, the using dev has no hints for the options he has constructing the string (prefixes "sm" and "md") and what identifier he needs to use ("b0is").

#### Incomplete optimization

Currently, optimization is incomplete, as props are only optimized independently of each other.

### Possible solution

I propose a markup bound solution that consists of two component types:

**Injection component usage:**

```svelte
<!-- No import! -->
<tdc-button
	tdc={/* This gives typesafety */ {
		destructive: true,
		hierarchy: 'primary',
		size: { default: 'sm', 'hover:md': 'md' }
	}}
	disabled
/>
<!-- Note above that you can pass style-irrelevant props outside of tdc= -->
<!-- Props passed inside of tdc=  have to be ONLY relevant to styles and not component logic. -->
```

**Actual component usage:**

```svelte
<script lang="ts">
	import Component from '..'
</script>
<Component
	tdc={/* Here comes the result from the registration process */}
	disabled
/>
```

As only the most top level component is susceptible to detection and passes the styles down to its children, we need to allow any registration depth within the configuration. The result of styles then looks like this:

```svelte
<!-- Note above that you can pass style-irrelevant props outside of tdc= -->

<!-- Gets converted to: -->
<script lang="ts">
	import Component from '..';
	/* This injectionResult will be injected via an import */
	interface InjectionResult {
		styles: Record<string | number | symbol, string>;
		children?: Record<string | number | symbol, InjectionResult>;
	}
	const injectionResult = {
		/* 'styles' is the property containing the actual tw classes */
		styles: { a: '', b: '' },
		/* children contains the actual children and can be nested infinitely */
		children: {
			icon: {
				styles: { a: '' /*, ... */ },
				children: {
					iconAtom: {
						styles: {
							/* ... */
						}
					}
				}
			},
			textAtom: {
				styles: {
					/* ... */
				}
			}
		}
	};
</script>

<Component
	tdc={injectionResult}
	disabled
/>
```

**Component construction**

```svelte
<script lang="ts">
	import {IconAtom} from '...'
	/* This would normally be an import. */
	type Injected = {
		tdc: {
			styles: {
				a: string;
				b: string;
			};
			children: {
				icon: {
					styles: {
						c: string;
						d: string;
					};
				};
			};
		};
	};
	interface $$Props extends Injected {}

	export let tdc: $$Props['tdc'];
</script>

<button class={tdc.styles.a}>
	<IconAtom tdc={tdc.children.icon} />
</button>
```

**Registration**
The registration needs multiple types of information:

-   Component name (`button` translates to `tdc-button`) ✅
-   Properties and their types (`destructive: boolean`, `hierarchy: "primary" | "..."`, `size: "sm" | "md" | "..."`) ✅
-   Child component registrations (mapping of parent component to child component) ✅
-   Styles (in dependence of the registration properties) ✅

```ts
const iconRegistration = new Registration({
    identifier: "icon",
    props: { size: ["md", "lg"] },
    styles: () => ({
        a: "",
    }),
    dependencies: {},
    mappings: {},
});

const registration = new Registration({
    identifier: "button",
    props: { destructive: ["true", "false"] },
    styles: s => ({
        a: `bg-${s("destructive", { true: "red", false: "green" })}-500`,
        b; ""
    }),
    dependencies: {
        icon: iconRegistration,
    },
    mappings: {
        icon: { size: m => m("destructive", { true: "lg", false: "md" }) },
    },
});
```

### Implementation strategy

The implementation should happen in this order:

-   [ ] Finish new registration
-   [ ] Make compilation work of these registrations (Compile just runs for every breakpoint and then diffs the changes.)
-   [ ] Implement new transforms (remove virtual imports)
-   [ ]

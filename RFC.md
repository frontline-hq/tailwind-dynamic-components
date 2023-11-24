Let's finalize our dynamic component props!

### Unique variant names

The simplest solution I can think of. We build a vite / rollup plugin that parses our source code for the existence of specific identifiers.

For a `<Button />` component, the **size variants** could be called

- `"sm-b0s"`
- `"md-b0s"`

and so forth, while a`<Badge />` component would have 

- `"sm-b1s"`
- `"md-b1s`.

We can play this game for **color variants** as well:

- `"sm-b0c"`
- `"md-b0c"`
- ...

### Tailwind modifiers

We will also allow the usage of tailwind modifiers:

- `"md:sm-b0c"`
- `"hover:md:sm-b0c"`

### Notes on the naming

- We use `...b0s` and not `...button_sizes`for the sake of brevity

### How do we configure the sizes, then?

The vite plugin then replaces these size variants with tailwind class names corresponding to the variant and modifier:

We only have to create a `registerToVite` function, that will match the correct component import and generate the right code on the fly within vite:

```ts
import {register} from 'tailwind-components'

// b0is: b for button, 0 as a number, i as icon, s for sizes
export const iconStyles = register('b0is')
    .variants(["sm", "md"])
    .dependencies({color: ["blue", "black"]})
    .styles(({v, m, d}: {v: string, m?: string, d?: string}) => {
         return `w-20 h-10 ${m}p-${v({sm: "4", md: "8"}, /* Default value (optional)*/)} ${d("color", {blue: "bg-blue-500", black: "bg-black"}, /* Default value (optional)*/)}`
     })

export const buttonStyles = register('b0s').children(iconStyles, ...)
```

Where `v({...})`:
- returns a string matching the requested variant.
- throws an error upon a requested variant that is not included in the `variants` array for `b0s`.

### Registration example

What is returned from the `register` chain is an object with a function that can be evaluated by vite during build:

```js
type RegisterChain: {
    b0is: (v, m, d) => (color) => `w-20 h-10 ${m}p-${v({sm: "4", md: "8"})} ${d("color", {blue: "bg-blue-500", black: "bg-black"})}`
}
```

```js
type RegisterChain: {
    b0is: (d) => {
        // default is injected without modifiers
        default: () => (color) => `w-20 h-10 ${d("color", {blue: "bg-blue-500", black: "bg-black"})}`
        // variable will be prepended with modifiers upon injection.
        variable: (v) => (color) => `p-${v({sm: "4", md: "8"})}`
    }
}
```

And `d("color", {blue: "bg-blue-500", black: "bg-black"})` returns:

```js
'${color === "blue" ? "bg-blue-500" : "bg-black"}'
```

### Injection Example

After evaluation, vite can then emit a file that can be imported:

```ts
const b0is = (color) => `w-20 h-10 ${color === "blue" ? "bg-blue-500" : "bg-black"}`
export const sm_b0is = (color) => `${b0is(color)} p-4`
export const md_md_b0is = (color) => `${b0is(color)} md:p-8`

export const sm_b0s = {
    b0is: sm_b0is
}
export const md_md_b0is = {
    b0is: md_md_b0is
}
```

```svelte
<script>
    import {Button} from 'path-to-button-component'
</script>

<Button color="blue" sizes={["sm_b0s", "md:md_b0s"]} />
```

Gets replaced with

```svelte
<script>
    import {Button} from 'path-to-button-component'
    import {sm_b0s, md_md_b0s} from 'path-to-emitted-styles-file'
</script>

<Button 
    color="blue"
    sizes={[sm_b0s, md_md_b0s]}
/>
```

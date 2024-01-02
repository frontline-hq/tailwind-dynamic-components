import { CompoundStyles, Styles } from "../../register";

export async function defineConfig() {
    return {
        debug: true,
        registrations: [
            new Styles("some-description"),
            new CompoundStyles("some-other-description").addInline(
                "some-description"
            ),
        ],
    };
}

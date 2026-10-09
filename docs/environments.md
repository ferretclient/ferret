# Environments and variables

An **environment** is a named set of variables, such as `Local`, `Staging` and `Production`, that you switch between without editing requests. Reference a variable anywhere as `{{name}}`: in URLs, headers, bodies, auth fields and scripts.

Environments are plain files inside the collection (`environments/Local.fer`, or `environments/Local.yml` in YAML collections), so they travel with the collection and can be committed to Git. **Secrets are the exception:** their values are encrypted on your machine and never written to those files.

## Variable scopes

The same name can be defined at several levels. When it is, the level highest in this list wins:

| Priority | Level | Where you edit it |
| --- | --- | --- |
| 1 (wins) | Runtime | set by scripts with `fer.setVar` while the app is running |
| 2 | Request | the request's **Vars** tab |
| 3 | Folder | the folder's settings |
| 4 | Environment | the environment editor (status bar → environment picker → Configure) |
| 5 | Collection | the collection's settings |
| 6 (lowest) | Global environment | the same editor, *Global* tab (shared by every collection in the workspace) |

## Data types

Each environment variable has a type, chosen from the small dropdown next to its value:

| Type | Behavior |
| --- | --- |
| `string` | the default |
| `number`, `boolean` | the text is converted, and a warning shows if it can't be |
| `object` | a JSON value, available to scripts as an object |
| `options` | a named list of choices, described below |

## Options: pick a value by name

Use an `options` variable when one setting has a fixed set of known values that you switch between. Example: a Business Central environment with several companies.

1. In the environment, add a variable `company` and set its type to **options**.
2. Click **Add options** and enter name → value pairs:

   | Name | Value |
   | --- | --- |
   | Company1 | 12345 |
   | Company2 | 43214 |

3. In the value cell, choose the **default** option.

`{{company}}` now sends the default option's **value** (`12345`) while the editor, and the picker below, show the **name** (`Company1`).

### Choose a different option for one request

Select the environment, open the request's **Vars** tab, and look at the **Environment options** section at the top. Every options variable of the active environment is listed with a dropdown of its option names; pick one and that request sends its value. Nothing needs to be typed.

Behind the scenes the choice is stored as an ordinary request variable of the same name (`company`), so it is saved with the request and shows up in the **Pre Request** table. Choosing the environment's own default option removes that variable again. Other requests keep using the environment's default. You can also create the variable by hand: a request variable named like an options variable shows the same dropdown in its value cell.

If the environment is later changed so that a request's saved value no longer matches any option, the picker shows it as `<value> (not in options)` instead of guessing.

### Command line and files

```bash
fer run --env Production --env-var company=Company2    # select an option by name
```

An options variable is stored in the environment file like this:

```
vars {
  @options
  @option('Company1=12345')
  @option('Company2=43214')
  company: Company1
}
```

The value (`Company1`) is the **name** of the default option.

In YAML collections it is an `options:` list next to the variable. Option names must be unique and cannot contain `=`.

Limits: secrets cannot be options (a secret's value is never stored in the file).

## Secrets

Mark a variable as a secret (the **Secrets** tab) to keep its value out of the collection files. Secret values are encrypted on your machine and live in Ferret's data folder, so each person who clones the collection enters their own.

## Inheritance

An environment can extend another (`extends`): it starts with the parent's variables and overrides the ones it redefines. Set it in the environment editor.

## Importing and exporting

Environments can be exported as JSON and imported again, including from Postman and from Bruno. Option lists are preserved.

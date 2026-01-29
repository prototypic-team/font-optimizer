import { A } from '@solidjs/router'
import { Component, JSX, onMount, Show, splitProps } from 'solid-js'

import { cn } from '../cn'
import { focusPropsNames, useFocus } from '../hooks/focusVisible'
import styles from './IconButton.module.css'

type Props = {
	autofocus?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['autofocus']

	disabled?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['disabled']

	children: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['children']
	class?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['class']
	href?: HTMLAnchorElement['href']

	kind?: 'base' | 'danger' | 'default' | 'secondary'

	onBlur?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['onBlur']
	onClick?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['onClick']
	onFocus?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['onFocus']
	onPointerDown?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['onPointerDown']
	title?: JSX.ButtonHTMLAttributes<
		HTMLButtonElement | HTMLAnchorElement
	>['title']
}

export const IconButton: Component<Props> = (props) => {
	let ref: HTMLElement | undefined
	const [local, link, focus, other] = splitProps(
		props,
		['autofocus', 'children', 'class', 'kind'],
		['href'],
		focusPropsNames
	)

	onMount(() => {
		if (local.autofocus && ref) ref?.focus()
	})

	const { focusVisible, props: focusProps } = useFocus(focus)

	return (
		<Show
			when={link.href}
			fallback={
				<button
					class={cn(
						styles.button,
						local.kind && styles[local.kind],
						local.class
					)}
					data-focus-visible={focusVisible()}
					data-kind={local.kind}
					type="button"
					ref={(el) => (ref = el)}
					{...other}
					{...focusProps}
				>
					<div data-button-role="focus-bg" class={styles.focusBackground}>
						{local.children}
					</div>
				</button>
			}
		>
			<A
				class={cn(styles.button, local.kind && styles[local.kind], local.class)}
				data-focus-visible={focusVisible()}
				href={link.href!}
				ref={(el) => (ref = el)}
				{...other}
				{...focusProps}
			>
				<div data-button-role="focus-bg" class={styles.focusBackground}>
					{local.children}
				</div>
			</A>
		</Show>
	)
}
